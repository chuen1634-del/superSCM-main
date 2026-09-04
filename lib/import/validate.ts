import { IMPORT_SCHEMAS } from './schema.ts';
import type {
  ImportRow,
  ImportType,
  IssueSeverity,
  ValidationIssue,
  ValidationSeverity,
  ValidationSummary,
} from './types.ts';

export type ValidationContext = {
  batchId: string;
  knownItemIds: Set<string>;
  knownSupplierIds: Set<string>;
  supplierAliases?: Map<string, string>;
  existingKeys: Set<string>;
  orderDates?: Map<string, string>;
};

export type ValidatedRow = {
  rowNumber: number;
  row: ImportRow;
  severity: ValidationSeverity;
};

export type ValidationResult = ValidationSummary & {
  rows: ValidatedRow[];
};

function textValue(value: unknown): string {
  return value === null || value === undefined ? '' : String(value).trim();
}

function normalizedCode(value: unknown): string {
  return textValue(value).toUpperCase().replace(/[\s\-_]/g, '');
}

function isDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

function numberValue(value: string): number | null {
  if (!value || !/^-?(?:\d+\.?\d*|\.\d+)$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function addIssue(
  issues: ValidationIssue[],
  context: ValidationContext,
  rowNumber: number,
  fieldName: string,
  errorCode: string,
  errorMessage: string,
  severity: IssueSeverity,
  originalValue: string,
) {
  issues.push({
    batchId: context.batchId,
    rowNumber,
    fieldName,
    errorCode,
    errorMessage,
    severity,
    originalValue: originalValue || null,
  });
}

function supplierKnown(value: string, context: ValidationContext): boolean {
  const code = normalizedCode(value);
  if (context.knownSupplierIds.has(code)) return true;
  return context.supplierAliases?.has(value.toUpperCase()) ?? false;
}

function rowKey(type: ImportType, row: ImportRow): string {
  const schema = IMPORT_SCHEMAS[type];
  return `${type}:${schema.naturalKeys.map((field) => normalizedCode(row[field])).join('|')}`;
}

export async function validateRows(
  type: ImportType,
  rows: ImportRow[],
  context: ValidationContext,
): Promise<ValidationResult> {
  const schema = IMPORT_SCHEMAS[type];
  const issues: ValidationIssue[] = [];
  const validatedRows: ValidatedRow[] = [];
  const seenKeys = new Set<string>();

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const rowIssues: ValidationIssue[] = [];
    const add = (
      fieldName: string,
      errorCode: string,
      errorMessage: string,
      severity: IssueSeverity,
      originalValue = textValue(row[fieldName]),
    ) => {
      const before = issues.length;
      addIssue(issues, context, rowNumber, fieldName, errorCode, errorMessage, severity, originalValue);
      rowIssues.push(issues[before]);
    };

    schema.required.forEach((fieldName) => {
      if (!textValue(row[fieldName])) {
        add(fieldName, 'REQUIRED_VALUE_MISSING', `${fieldName} 필수값이 없습니다.`, 'ERROR');
      }
    });

    schema.dates.forEach((fieldName) => {
      const value = textValue(row[fieldName]);
      if (value && !isDate(value)) {
        add(fieldName, 'INVALID_DATE', `${fieldName} 날짜 형식이 올바르지 않습니다. YYYY-MM-DD 형식이 필요합니다.`, 'ERROR', value);
      }
    });

    schema.numeric.forEach((fieldName) => {
      const value = textValue(row[fieldName]);
      if (!value) return;
      const parsed = numberValue(value);
      if (parsed === null) {
        add(fieldName, 'INVALID_NUMBER', `${fieldName} 숫자 형식이 올바르지 않습니다.`, 'ERROR', value);
      } else if (parsed < 0) {
        add(fieldName, 'NEGATIVE_VALUE', `${fieldName}에 음수 값이 입력되었습니다.`, 'ERROR', value);
      }
    });

    const itemField = ['item_id', '품목코드'].find((fieldName) => fieldName in row);
    if (itemField && textValue(row[itemField]) && !context.knownItemIds.has(normalizedCode(row[itemField]))) {
      add(itemField, 'UNKNOWN_ITEM', '품목 마스터에 존재하지 않는 품목코드입니다.', 'ERROR');
    }

    const supplierField = ['supplier_id', '공급업체코드', '공급업체'].find((fieldName) => fieldName in row);
    if (supplierField && textValue(row[supplierField]) && !supplierKnown(textValue(row[supplierField]), context)) {
      add(supplierField, 'UNKNOWN_SUPPLIER', '공급처 마스터에 존재하지 않는 공급처입니다.', 'ERROR');
    }

    const key = rowKey(type, row);
    if (schema.naturalKeys.every((fieldName) => textValue(row[fieldName]))) {
      if (seenKeys.has(key) || context.existingKeys.has(key)) {
        add(schema.naturalKeys.join(','), 'DUPLICATE_SOURCE_RECORD', '동일한 자연키가 이미 존재합니다.', 'ERROR', key);
      }
      seenKeys.add(key);
    }

    if (type === 'goods_receipt') {
      const poNo = textValue(row['발주번호']);
      const receiptDate = textValue(row['입고일']);
      const orderDate = context.orderDates?.get(poNo);
      if (orderDate && isDate(receiptDate) && receiptDate < orderDate) {
        add('입고일', 'INVALID_DATE_ORDER', '입고일이 발주일보다 빠릅니다.', 'ERROR', receiptDate);
      }
    }

    if (type === 'sales_order') {
      const orderDate = textValue(row.order_date);
      const needDate = textValue(row.need_date);
      if (orderDate && needDate && isDate(orderDate) && isDate(needDate) && needDate < orderDate) {
        add('need_date', 'INVALID_DATE_ORDER', '필요일이 주문일보다 빠릅니다.', 'ERROR', needDate);
      }
    }

    const severity: ValidationSeverity = rowIssues.some((issue) => issue.severity === 'ERROR')
      ? 'ERROR'
      : rowIssues.length > 0
        ? 'WARNING'
        : 'SUCCESS';
    validatedRows.push({ rowNumber, row, severity });
  });

  const successRows = validatedRows.filter((row) => row.severity === 'SUCCESS').length;
  const warningRows = validatedRows.filter((row) => row.severity === 'WARNING').length;
  const errorRows = validatedRows.filter((row) => row.severity === 'ERROR').length;

  return {
    status: errorRows > 0 ? 'ERROR' : warningRows > 0 ? 'WARNING' : 'SUCCESS',
    totalRows: rows.length,
    successRows,
    warningRows,
    errorRows,
    issues,
    rows: validatedRows,
  };
}
