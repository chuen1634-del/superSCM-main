import type { ColumnMapping, ImportRow, ImportSchema, ImportType } from './types.ts';

const usageHistory: ImportSchema = {
  table: 'usage_history',
  required: ['usage_id', 'item_id', 'use_date', 'qty'],
  numeric: ['qty'],
  dates: ['use_date'],
  naturalKeys: ['usage_id'],
  aliases: {
    usage_id: ['usage_id', '사용이력번호', '사용번호'],
    item_id: ['item_id', '품목코드', '품목 ID'],
    use_date: ['use_date', '사용일', '사용일자', '출고일'],
    qty: ['qty', '수량', '사용수량', '출고수량'],
    warehouse: ['warehouse', '창고', '사용창고'],
    note: ['note', '비고', '메모'],
  },
};

const inventory: ImportSchema = {
  table: 'inventory',
  required: ['품목코드', '창고', '현재고', '기준일자'],
  numeric: ['현재고', '안전재고'],
  dates: ['기준일자'],
  naturalKeys: ['품목코드', '창고', '기준일자'],
  aliases: {
    품목코드: ['품목코드', 'item_id', 'item_code'],
    창고: ['창고', 'warehouse'],
    현재고: ['현재고', 'current_stock', 'stock'],
    기준일자: ['기준일자', 'as_of_date', 'inventory_date'],
    안전재고: ['안전재고', 'safety_stock'],
  },
};

const itemMaster: ImportSchema = {
  table: 'item_master',
  required: ['품목코드', '품목명'],
  numeric: ['표준단가'],
  dates: [],
  naturalKeys: ['품목코드'],
  aliases: {
    품목코드: ['품목코드', 'item_id', 'item_code'],
    품목명: ['품목명', 'item_name', 'name'],
    품목구분: ['품목구분', 'item_type', 'category'],
    단위: ['단위', 'unit'],
    표준단가: ['표준단가', 'standard_price', 'unit_price'],
    사용여부: ['사용여부', 'is_active', 'active'],
    supplier_id: ['supplier_id', '공급업체코드', 'supplier_code'],
  },
};

const supplierMaster: ImportSchema = {
  table: 'supplier_master',
  required: ['공급업체코드', '공급업체명', '국가'],
  numeric: ['표준리드타임(일)'],
  dates: [],
  naturalKeys: ['공급업체코드'],
  aliases: {
    공급업체코드: ['공급업체코드', 'supplier_id', 'supplier_code'],
    공급업체명: ['공급업체명', 'supplier_name', 'name'],
    국가: ['국가', 'country'],
    '표준리드타임(일)': ['표준리드타임(일)', 'std_lead_time', 'lead_time_days'],
    담당자: ['담당자', 'contact'],
    사용여부: ['사용여부', 'is_active', 'active'],
  },
};

const purchaseOrder: ImportSchema = {
  table: 'purchase_order',
  required: ['발주번호', '발주일', '공급업체', '품목코드', '발주수량'],
  numeric: ['발주수량', '단가'],
  dates: ['발주일', '납기예정일'],
  naturalKeys: ['발주번호'],
  aliases: {
    발주번호: ['발주번호', 'po_no', 'purchase_order_id'],
    발주일: ['발주일', 'order_date'],
    공급업체: ['공급업체', 'supplier_id', 'supplier_name', 'supplier_code'],
    품목코드: ['품목코드', 'item_id', 'item_code'],
    발주수량: ['발주수량', 'quantity', 'order_qty'],
    단가: ['단가', 'unit_price'],
    납기예정일: ['납기예정일', 'due_date', 'expected_date'],
    발주담당: ['발주담당', 'buyer'],
  },
};

const goodsReceipt: ImportSchema = {
  table: 'goods_receipt',
  required: ['입고번호', '발주번호', '품목코드', '입고수량', '입고일'],
  numeric: ['입고수량'],
  dates: ['입고일'],
  naturalKeys: ['입고번호'],
  aliases: {
    입고번호: ['입고번호', 'receipt_id', 'goods_receipt_id'],
    발주번호: ['발주번호', 'po_no', 'purchase_order_id'],
    품목코드: ['품목코드', 'item_id', 'item_code'],
    입고수량: ['입고수량', 'quantity', 'receipt_qty'],
    입고일: ['입고일', 'receipt_date'],
    입고창고: ['입고창고', 'warehouse'],
  },
};

const salesOrder: ImportSchema = {
  table: 'sales_order',
  required: ['sales_order_id', 'order_date', 'item_id', 'quantity'],
  numeric: ['quantity'],
  dates: ['order_date', 'need_date'],
  naturalKeys: ['sales_order_id'],
  aliases: {
    sales_order_id: ['sales_order_id', '판매주문번호', '주문번호'],
    order_date: ['order_date', '주문일', '주문일자'],
    customer_id: ['customer_id', '고객코드', '고객번호'],
    item_id: ['item_id', '품목코드', 'item_code'],
    quantity: ['quantity', '수량', '주문수량'],
    need_date: ['need_date', '필요일', '납기요청일'],
    status: ['status', '상태'],
  },
};

const businessEvent: ImportSchema = {
  table: 'business_event',
  required: ['event_id', 'event_type'],
  numeric: ['impact_factor'],
  dates: ['event_date'],
  naturalKeys: ['event_id'],
  aliases: {
    event_id: ['event_id', '이벤트번호', '행사번호'],
    event_type: ['event_type', '이벤트유형', '행사유형'],
    event_date: ['event_date', '이벤트일', '행사일'],
    item_id: ['item_id', '품목코드', 'item_code'],
    supplier_id: ['supplier_id', '공급업체코드'],
    event_name: ['event_name', '이벤트명', '행사명'],
    impact_factor: ['impact_factor', '영향계수'],
    note: ['note', '비고', '메모'],
  },
};

export const IMPORT_SCHEMAS: Record<ImportType, ImportSchema> = {
  usage_history: usageHistory,
  inventory,
  item_master: itemMaster,
  supplier_master: supplierMaster,
  purchase_order: purchaseOrder,
  goods_receipt: goodsReceipt,
  sales_order: salesOrder,
  business_event: businessEvent,
};

export function isSupportedImportType(value: string): value is ImportType {
  return Object.prototype.hasOwnProperty.call(IMPORT_SCHEMAS, value);
}

export function applyColumnMapping(rows: ImportRow[], mappings: ColumnMapping[]): ImportRow[] {
  const mappingByHeader = new Map(
    mappings
      .filter((mapping) => mapping.targetColumn)
      .map((mapping) => [mapping.sourceHeader, mapping.targetColumn as string]),
  );

  return rows.map((row) => Object.entries(row).reduce<ImportRow>((normalized, [sourceHeader, value]) => {
    const targetColumn = mappingByHeader.get(sourceHeader);
    if (targetColumn) normalized[targetColumn] = value;
    return normalized;
  }, {}));
}
