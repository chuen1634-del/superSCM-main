import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { IMPORT_SCHEMAS } from './schema.ts';
import type { ColumnMapping, ImportRow, ImportType, ParsedImport } from './types.ts';

const MAX_FILE_BYTES = 25 * 1024 * 1024;

function canonicalHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_\-]/g, '');
}

function inferMappings(type: ImportType, headers: string[]): ColumnMapping[] {
  const aliases = IMPORT_SCHEMAS[type].aliases;
  return headers.map((sourceHeader) => {
    const canonicalSource = canonicalHeader(sourceHeader);
    const targetColumn = Object.entries(aliases).find(([, candidates]) =>
      candidates.some((candidate) => canonicalHeader(candidate) === canonicalSource),
    )?.[0] ?? null;
    return {
      sourceHeader,
      targetColumn,
      confidence: targetColumn ? 1 : 0,
      confirmed: false,
    };
  });
}

function matrixToRows(matrix: unknown[][]): { headers: string[]; rows: ImportRow[] } {
  const headerRow = matrix[0] ?? [];
  const headers = headerRow.map((header) => String(header ?? '').trim());
  if (headers.length === 0 || headers.every((header) => !header)) {
    throw new Error('파일의 첫 번째 행에서 컬럼명을 찾을 수 없습니다.');
  }

  const rows = matrix.slice(1)
    .filter((row) => row.some((value) => value !== null && value !== undefined && String(value).trim() !== ''))
    .map((row) => headers.reduce<ImportRow>((record, header, index) => {
      if (header) record[header] = row[index] ?? null;
      return record;
    }, {}));

  return { headers, rows };
}

async function parseCsv(file: File): Promise<{ headers: string[]; rows: ImportRow[] }> {
  const text = await file.text();
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (header) => header.trim(),
      complete: (result) => {
        if (result.errors.length > 0) {
          reject(new Error(`CSV 파싱 오류가 ${result.errors.length}건 있습니다.`));
          return;
        }
        resolve({
          headers: result.meta.fields ?? [],
          rows: result.data as ImportRow[],
        });
      },
      error: (error: Error) => reject(new Error(`CSV를 읽을 수 없습니다: ${error.message}`)),
    });
  });
}

async function parseExcel(file: File): Promise<{ headers: string[]; rows: ImportRow[] }> {
  const workbook = XLSX.read(Buffer.from(await file.arrayBuffer()), { type: 'buffer', raw: false });
  const firstSheet = workbook.SheetNames[0];
  if (!firstSheet) throw new Error('Excel 파일에 시트가 없습니다.');
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[firstSheet], {
    header: 1,
    defval: null,
    raw: false,
  });
  return matrixToRows(matrix);
}

export async function parseFile(file: File, type: ImportType): Promise<ParsedImport> {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error('파일 크기가 25MB를 초과했습니다. 파일을 나누어 업로드하세요.');
  }

  const lowerName = file.name.toLowerCase();
  let parsed: { headers: string[]; rows: ImportRow[] };
  if (lowerName.endsWith('.csv')) {
    parsed = await parseCsv(file);
  } else if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) {
    parsed = await parseExcel(file);
  } else {
    throw new Error('CSV 또는 Excel(.xlsx) 파일만 업로드할 수 있습니다.');
  }

  return {
    fileName: file.name,
    headers: parsed.headers,
    rows: parsed.rows,
    mappings: inferMappings(type, parsed.headers),
  };
}
