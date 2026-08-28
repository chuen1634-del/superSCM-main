export type ImportType =
  | 'usage_history'
  | 'inventory'
  | 'item_master'
  | 'supplier_master'
  | 'purchase_order'
  | 'goods_receipt'
  | 'sales_order'
  | 'business_event';

export type ImportMode = 'append' | 'upsert' | 'replace';
export type ValidationSeverity = 'SUCCESS' | 'WARNING' | 'ERROR';
export type IssueSeverity = 'WARNING' | 'ERROR';
export type BatchStatus =
  | 'STAGED'
  | 'VALIDATING'
  | 'VALIDATED'
  | 'IMPORTING'
  | 'IMPORTED'
  | 'FAILED'
  | 'ROLLED_BACK';

export type ImportRow = Record<string, unknown>;

export type ColumnMapping = {
  sourceHeader: string;
  targetColumn: string | null;
  confidence: number;
  confirmed: boolean;
};

export type ParsedImport = {
  fileName: string;
  headers: string[];
  rows: ImportRow[];
  mappings: ColumnMapping[];
};

export type ImportSchema = {
  table: string;
  required: string[];
  numeric: string[];
  dates: string[];
  naturalKeys: string[];
  aliases: Record<string, string[]>;
};

export type StagingRow = {
  batchId: string;
  rowNumber: number;
  sourceData: ImportRow;
  normalizedData: ImportRow;
};

export type ValidationIssue = {
  batchId: string;
  rowNumber: number;
  fieldName: string;
  errorCode: string;
  errorMessage: string;
  severity: IssueSeverity;
  originalValue: string | null;
};

export type ValidationSummary = {
  status: 'SUCCESS' | 'WARNING' | 'ERROR';
  totalRows: number;
  successRows: number;
  warningRows: number;
  errorRows: number;
  issues: ValidationIssue[];
};

export type UploadBatch = {
  batchId: string;
  fileName: string;
  importType: ImportType;
  importMode: ImportMode;
  totalRows: number;
  successRows: number;
  warningRows: number;
  errorRows: number;
  status: BatchStatus;
  uploadedBy: string;
  uploadedAt: string;
  importedAt: string | null;
  forecastStale: boolean;
  dataSnapshotAt: string | null;
};
