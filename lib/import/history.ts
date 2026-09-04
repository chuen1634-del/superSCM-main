import { requireAdmin } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { ImportRow, UploadBatch } from './types.ts';
import { getHistory } from './repository.ts';

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export { getHistory };

export async function listImportHistory(): Promise<UploadBatch[]> {
  return getHistory();
}

export async function buildErrorCsv(batchId: string): Promise<string> {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const [{ data: errors, error: errorError }, { data: staging, error: stagingError }] = await Promise.all([
    supabase.schema('core').from('validation_error')
      .select('row_number,field_name,error_code,error_message,severity,original_value')
      .eq('batch_id', batchId)
      .in('severity', ['ERROR', 'WARNING'])
      .order('row_number'),
    supabase.schema('core').from('import_staging')
      .select('row_number,source_data')
      .eq('batch_id', batchId)
      .order('row_number'),
  ]);
  if (errorError) throw new Error(errorError.message);
  if (stagingError) throw new Error(stagingError.message);

  const stagingByRow = new Map((staging ?? []).map((row) => [Number(row.row_number), row.source_data as ImportRow]));
  const originalHeaders = Array.from(new Set(
    (staging ?? []).flatMap((row) => Object.keys((row.source_data ?? {}) as ImportRow)),
  ));
  const headers = [...originalHeaders, 'row_number', 'field_name', 'error_code', 'error_message', 'severity'];
  const lines = [headers.map(csvCell).join(',')];
  for (const issue of errors ?? []) {
    const source = stagingByRow.get(Number(issue.row_number)) ?? {};
    lines.push([
      ...originalHeaders.map((header) => csvCell(source[header])),
      csvCell(issue.row_number),
      csvCell(issue.field_name),
      csvCell(issue.error_code),
      csvCell(issue.error_message),
      csvCell(issue.severity),
    ].join(','));
  }
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}
