import { requireAdmin } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { applyColumnMapping } from './schema.ts';
import type {
  ColumnMapping,
  ImportMode,
  ImportRow,
  ImportType,
  StagingRow,
  UploadBatch,
  ValidationIssue,
} from './types.ts';
import { validateRows, type ValidationContext, type ValidationResult } from './validate.ts';
import { IMPORT_SCHEMAS } from './schema.ts';

type DbBatch = Record<string, unknown>;

function mapBatch(row: DbBatch): UploadBatch {
  return {
    batchId: String(row.batch_id),
    fileName: String(row.file_name),
    importType: row.import_type as ImportType,
    importMode: row.import_mode as ImportMode,
    totalRows: Number(row.total_rows ?? 0),
    successRows: Number(row.success_rows ?? 0),
    warningRows: Number(row.warning_rows ?? 0),
    errorRows: Number(row.error_rows ?? 0),
    status: row.status as UploadBatch['status'],
    uploadedBy: String(row.uploaded_by),
    uploadedAt: String(row.uploaded_at),
    importedAt: row.imported_at ? String(row.imported_at) : null,
    forecastStale: Boolean(row.forecast_stale),
    dataSnapshotAt: row.data_snapshot_at ? String(row.data_snapshot_at) : null,
  };
}

function throwDatabaseError(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

async function adminClient() {
  const context = await requireAdmin();
  return { context, supabase: await createSupabaseServerClient() };
}

export async function createUploadBatch(input: {
  fileName: string;
  importType: ImportType;
  importMode: ImportMode;
  totalRows: number;
}): Promise<UploadBatch> {
  const { context: authContext, supabase } = await adminClient();
  const { authUser } = authContext;
  const { data, error } = await supabase.schema('core').from('upload_batch').insert({
    file_name: input.fileName,
    import_type: input.importType,
    import_mode: input.importMode,
    total_rows: input.totalRows,
    uploaded_by: authUser.id,
    status: 'STAGED',
  }).select('*').single();
  throwDatabaseError(error);
  if (!data) throw new Error('업로드 batch 생성 결과가 없습니다.');
  return mapBatch(data as DbBatch);
}

export async function stageRows(batchId: string, rows: ImportRow[], mappings: ColumnMapping[]): Promise<void> {
  await adminClient();
  const normalizedRows = applyColumnMapping(rows, mappings);
  const payload: StagingRow[] = rows.map((sourceData, index) => ({
    batchId,
    rowNumber: index + 2,
    sourceData,
    normalizedData: normalizedRows[index],
  }));
  const supabase = (await createSupabaseServerClient()).schema('core');
  for (let index = 0; index < payload.length; index += 500) {
    const chunk = payload.slice(index, index + 500).map((row) => ({
      batch_id: row.batchId,
      row_number: row.rowNumber,
      source_data: row.sourceData,
      normalized_data: row.normalizedData,
      validation_status: 'PENDING',
    }));
    const { error } = await supabase.from('import_staging').insert(chunk);
    throwDatabaseError(error);
  }
}

export async function loadSavedMappings(importType: ImportType, mappings: ColumnMapping[]): Promise<ColumnMapping[]> {
  await adminClient();
  const { data, error } = await (await createSupabaseServerClient()).schema('core')
    .from('column_mapping').select('source_header,target_column,confidence,confirmed')
    .eq('import_type', importType);
  throwDatabaseError(error);
  const saved = new Map((data ?? []).map((row) => [String(row.source_header), {
    sourceHeader: String(row.source_header),
    targetColumn: row.target_column ? String(row.target_column) : null,
    confidence: Number(row.confidence ?? 0),
    confirmed: Boolean(row.confirmed),
  }]));
  return mappings.map((mapping) => saved.get(mapping.sourceHeader) ?? mapping);
}

export async function loadStagingRows(batchId: string): Promise<StagingRow[]> {
  await adminClient();
  const supabase = (await createSupabaseServerClient()).schema('core');
  const { data, error } = await supabase.from('import_staging')
    .select('batch_id,row_number,source_data,normalized_data')
    .eq('batch_id', batchId)
    .order('row_number');
  throwDatabaseError(error);
  return (data ?? []).map((row) => ({
    batchId: String(row.batch_id),
    rowNumber: Number(row.row_number),
    sourceData: row.source_data as ImportRow,
    normalizedData: (row.normalized_data ?? {}) as ImportRow,
  }));
}

export async function getValidationContext(batchId: string): Promise<ValidationContext> {
  await adminClient();
  const supabase = await createSupabaseServerClient();
  const [{ data: items, error: itemError }, { data: suppliers, error: supplierError }, { data: aliases, error: aliasError }] = await Promise.all([
    supabase.schema('core').from('v_item_master').select('item_id'),
    supabase.schema('core').from('supplier_alias').select('supplier_id'),
    supabase.schema('core').from('supplier_alias').select('alias, supplier_id'),
  ]);
  throwDatabaseError(itemError);
  throwDatabaseError(supplierError);
  throwDatabaseError(aliasError);
  const staging = await loadStagingRows(batchId);
  const existingKeys = new Set<string>();
  return {
    batchId,
    knownItemIds: new Set((items ?? []).map((row) => String(row.item_id).toUpperCase().replace(/[\s\-_]/g, ''))),
    knownSupplierIds: new Set((suppliers ?? []).map((row) => String(row.supplier_id).toUpperCase())),
    supplierAliases: new Map((aliases ?? []).map((row) => [String(row.alias).toUpperCase(), String(row.supplier_id)])),
    existingKeys,
    orderDates: new Map(),
  };
}

export async function validateStaging(batchId: string, importType: ImportType): Promise<ValidationResult> {
  const rows = await loadStagingRows(batchId);
  const context = await getValidationContext(batchId);
  return validateRows(importType, rows.map((row) => row.normalizedData), context);
}

export async function saveMappingAndValidate(
  batchId: string,
  importType: ImportType,
  mappings: ColumnMapping[],
): Promise<ValidationResult> {
  const { context: authContext, supabase } = await adminClient();
  const { authUser } = authContext;
  const schema = IMPORT_SCHEMAS[importType];
  const allowedTargets = new Set(Object.keys(schema.aliases));
  const invalidMappings = mappings.filter(
    (mapping) => mapping.targetColumn !== null && !allowedTargets.has(mapping.targetColumn),
  );
  const duplicateTargets = new Set<string>();
  const duplicateMappings = mappings.filter((mapping) => {
    if (!mapping.targetColumn) return false;
    if (duplicateTargets.has(mapping.targetColumn)) return true;
    duplicateTargets.add(mapping.targetColumn);
    return false;
  });
  if (invalidMappings.length > 0 || duplicateMappings.length > 0) {
    throw new Error('허용되지 않거나 중복된 표준 컬럼 매핑입니다. 매핑을 확인해 주세요.');
  }
  const rows = await loadStagingRows(batchId);
  const normalizedRows = applyColumnMapping(rows.map((row) => row.sourceData), mappings);
  const { error: mappingError } = await supabase.schema('core').from('column_mapping').upsert(
    mappings.filter((mapping) => mapping.targetColumn).map((mapping) => ({
      import_type: importType,
      source_header: mapping.sourceHeader,
      target_column: mapping.targetColumn,
      confidence: mapping.confidence,
      confirmed: true,
      updated_by: authUser.id,
      updated_at: new Date().toISOString(),
    })),
    { onConflict: 'import_type,source_header' },
  );
  throwDatabaseError(mappingError);

  const validationContext = await getValidationContext(batchId);
  const result = await validateRows(importType, normalizedRows, validationContext);
  await saveValidationResult(batchId, result);
  return result;
}

export async function confirmReplace(batchId: string): Promise<void> {
  const { context, supabase } = await adminClient();
  const { authUser } = context;
  const { error } = await supabase.schema('core').from('upload_batch').update({
    replace_confirmed_at: new Date().toISOString(),
    replace_confirmed_by: authUser.id,
    updated_at: new Date().toISOString(),
  }).eq('batch_id', batchId).eq('import_mode', 'replace');
  throwDatabaseError(error);
}

export async function callImportRpc(batchId: string): Promise<Record<string, unknown>> {
  await adminClient();
  const { data, error } = await (await createSupabaseServerClient()).schema('core')
    .rpc('import_approved_batch', { target_batch_id: batchId });
  throwDatabaseError(error);
  return (data ?? {}) as Record<string, unknown>;
}

export async function callRollbackRpc(batchId: string): Promise<Record<string, unknown>> {
  await adminClient();
  const { data, error } = await (await createSupabaseServerClient()).schema('core')
    .rpc('rollback_batch', { target_batch_id: batchId });
  throwDatabaseError(error);
  return (data ?? {}) as Record<string, unknown>;
}

export async function saveValidationResult(batchId: string, result: ValidationResult): Promise<void> {
  await adminClient();
  const supabase = (await createSupabaseServerClient()).schema('core');
  const { error: deleteError } = await supabase.from('validation_error').delete().eq('batch_id', batchId);
  throwDatabaseError(deleteError);

  const { error: stagingError } = await supabase.from('import_staging').upsert(
    result.rows.map((row) => ({
      batch_id: batchId,
      row_number: row.rowNumber,
      normalized_data: row.row,
      validation_status: row.severity,
    })),
    { onConflict: 'batch_id,row_number' },
  );
  throwDatabaseError(stagingError);

  for (let index = 0; index < result.issues.length; index += 500) {
    const chunk = result.issues.slice(index, index + 500).map((issue: ValidationIssue) => ({
      batch_id: issue.batchId,
      row_number: issue.rowNumber,
      field_name: issue.fieldName,
      error_code: issue.errorCode,
      error_message: issue.errorMessage,
      severity: issue.severity,
      original_value: issue.originalValue,
    }));
    const { error } = await supabase.from('validation_error').insert(chunk);
    throwDatabaseError(error);
  }

  const { error: batchError } = await supabase.from('upload_batch').update({
    status: result.errorRows > 0 ? 'FAILED' : 'VALIDATED',
    total_rows: result.totalRows,
    success_rows: result.successRows,
    warning_rows: result.warningRows,
    error_rows: result.errorRows,
    updated_at: new Date().toISOString(),
  }).eq('batch_id', batchId);
  throwDatabaseError(batchError);
}

export async function getBatch(batchId: string): Promise<UploadBatch> {
  await adminClient();
  const { data, error } = await (await createSupabaseServerClient()).schema('core')
    .from('upload_batch').select('*').eq('batch_id', batchId).single();
  throwDatabaseError(error);
  if (!data) throw new Error('업로드 batch를 찾을 수 없습니다.');
  return mapBatch(data as DbBatch);
}

export async function getHistory(): Promise<UploadBatch[]> {
  await adminClient();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.schema('core')
    .from('upload_batch').select('*').order('uploaded_at', { ascending: false }).limit(100);
  throwDatabaseError(error);
  const { data: users, error: userError } = await supabase.schema('core').from('app_user').select('user_id,email');
  throwDatabaseError(userError);
  const emails = new Map((users ?? []).map((row) => [String(row.user_id), String(row.email)]));
  return (data ?? []).map((row) => {
    const batch = mapBatch(row as DbBatch);
    return { ...batch, uploadedBy: emails.get(batch.uploadedBy) ?? batch.uploadedBy };
  });
}
