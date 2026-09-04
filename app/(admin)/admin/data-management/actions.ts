'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { isSupportedImportType } from '@/lib/import/schema.ts';
import { parseFile } from '@/lib/import/parse.ts';
import type { ColumnMapping, ImportMode, ImportType } from '@/lib/import/types.ts';
import {
  callImportRpc,
  callRollbackRpc,
  confirmReplace,
  createUploadBatch,
  loadSavedMappings,
  saveMappingAndValidate,
  stageRows,
} from '@/lib/import/repository.ts';
import { buildErrorCsv } from '@/lib/import/history.ts';

export type ImportActionResult = {
  error?: string;
  success?: string;
  batchId?: string;
  fileName?: string;
  importType?: ImportType;
  importMode?: ImportMode;
  headers?: string[];
  previewRows?: Record<string, unknown>[];
  mappings?: ColumnMapping[];
  totalRows?: number;
  validation?: {
    status: 'SUCCESS' | 'WARNING' | 'ERROR';
    totalRows: number;
    successRows: number;
    warningRows: number;
    errorRows: number;
    issues: Array<{
      rowNumber: number;
      fieldName: string;
      errorCode: string;
      errorMessage: string;
      severity: 'WARNING' | 'ERROR';
      originalValue: string | null;
    }>;
  };
  csv?: string;
};

function parseMode(value: FormDataEntryValue | null): ImportMode | null {
  return value === 'append' || value === 'upsert' || value === 'replace' ? value : null;
}

export async function stageUploadAction(formData: FormData): Promise<ImportActionResult> {
  await requireAdmin();
  const file = formData.get('file');
  const importTypeValue = String(formData.get('import_type') ?? '');
  const importMode = parseMode(formData.get('import_mode'));
  if (!(file instanceof File) || file.size === 0) return { error: '업로드할 파일을 선택하세요.' };
  if (!isSupportedImportType(importTypeValue) || !importMode) return { error: 'Import Type 또는 Import Mode가 올바르지 않습니다.' };

  try {
    const parsed = await parseFile(file, importTypeValue);
    const batch = await createUploadBatch({
      fileName: parsed.fileName,
      importType: importTypeValue,
      importMode,
      totalRows: parsed.rows.length,
    });
    const mappings = await loadSavedMappings(importTypeValue, parsed.mappings);
    await stageRows(batch.batchId, parsed.rows, mappings);
    return {
      batchId: batch.batchId,
      fileName: parsed.fileName,
      importType: importTypeValue,
      importMode,
      headers: parsed.headers,
      previewRows: parsed.rows.slice(0, 20),
      mappings,
      totalRows: parsed.rows.length,
      success: '파일을 staging에 저장했습니다. 컬럼 매핑을 확인하세요.',
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : '파일 staging에 실패했습니다.' };
  }
}

export async function validateBatchAction(
  batchId: string,
  importType: string,
  mappingsJson: string,
): Promise<ImportActionResult> {
  await requireAdmin();
  if (!batchId || !isSupportedImportType(importType)) return { error: '검증 요청 값이 올바르지 않습니다.' };
  try {
    const mappings = JSON.parse(mappingsJson) as ColumnMapping[];
    const validation = await saveMappingAndValidate(batchId, importType, mappings);
    return {
      batchId,
      validation: {
        status: validation.status,
        totalRows: validation.totalRows,
        successRows: validation.successRows,
        warningRows: validation.warningRows,
        errorRows: validation.errorRows,
        issues: validation.issues.map(({ rowNumber, fieldName, errorCode, errorMessage, severity, originalValue }) => ({
          rowNumber, fieldName, errorCode, errorMessage, severity, originalValue,
        })),
      },
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : '검증에 실패했습니다.' };
  }
}

export async function confirmReplaceAction(batchId: string): Promise<ImportActionResult> {
  await requireAdmin();
  try {
    await confirmReplace(batchId);
    return { batchId, success: 'replace 확인이 저장되었습니다.' };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'replace 확인에 실패했습니다.' };
  }
}

export async function importBatchAction(batchId: string): Promise<ImportActionResult> {
  await requireAdmin();
  try {
    await callImportRpc(batchId);
    revalidatePath('/admin/data-management');
    return { batchId, success: 'RAW 적재가 완료되었습니다.' };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'RAW 적재에 실패했습니다.' };
  }
}

export async function rollbackBatchAction(batchId: string): Promise<ImportActionResult> {
  await requireAdmin();
  try {
    await callRollbackRpc(batchId);
    revalidatePath('/admin/data-management');
    return { batchId, success: 'batch rollback이 완료되었습니다.' };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'rollback에 실패했습니다.' };
  }
}

export async function downloadErrorCsvAction(batchId: string): Promise<ImportActionResult> {
  await requireAdmin();
  try {
    return { batchId, csv: await buildErrorCsv(batchId) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : '오류 CSV 생성에 실패했습니다.' };
  }
}
