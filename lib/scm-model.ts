export type LeadtimeGap = {
  supplier: string;
  country: string;
  masterLeadTime: number | null;
  sampleCount: number;
  actualAverage: number | null;
  p80: number | null;
  gap: number | null;
};

export type StockoutRiskStatus = 'SAFE' | 'CRITICAL' | 'UNKNOWN';
export type StockoutReason = 'NO_USAGE' | 'NO_LEADTIME';

export type StockoutRisk = {
  itemId: string;
  itemName: string;
  supplierId: string;
  currentStock: number | null;
  inboundQty: number | null;
  availableQty: number | null;
  dailyUsageAvg: number | null;
  cv: number | null;
  plannedLeadTime: number | null;
  stockoutDays: number | null;
  stockoutDate: string | null;
  riskStatus: StockoutRiskStatus;
  reason: StockoutReason | null;
};

export type StockoutKpi = {
  nItems: number;
  nCritical: number;
  nSafe: number;
  nUnknown: number;
  nWithin30d: number;
  avgStockoutDays: number | null;
};

export type ShipmentTrend = {
  itemCode: string;
  itemName: string | null;
  period: string | null;
  shipmentCount: number | null;
  shipmentQty: number | null;
  rollingAverage: number | null;
};

export type DemandProfileRt = {
  itemCode: string;
  itemName: string | null;
  validDays: number | null;
  dailyDemandAvg: number | null;
  dailyDemandSd: number | null;
  cv: number | null;
  trend: number | null;
  source: string | null;
  reasonCode: string | null;
};

export type OlAccuracy = {
  modelBase: string;
  period: string | null;
  fiscalYear: string | null;
  olQty: number | null;
  actualQty: number | null;
  accuracy: number | null;
  errorQty: number | null;
  reasonCode: string | null;
};

export type BomRequirement = {
  modelBase: string;
  itemCode: string;
  itemName: string | null;
  bomQty: number | null;
  attachmentRate: number | null;
  requiredQty: number | null;
  reasonCode: string | null;
};

function value(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== '') return row[key];
  }
  return null;
}

function numberValue(row: Record<string, unknown>, keys: string[]) {
  const raw = value(row, keys);
  if (raw === null) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function stringValue(row: Record<string, unknown>, keys: string[], fallback = '') {
  return String(value(row, keys) ?? fallback);
}

function nullableStringValue(row: Record<string, unknown>, keys: string[]) {
  const raw = value(row, keys);
  return raw === null ? null : String(raw);
}

function stockoutStatus(value: unknown): StockoutRiskStatus {
  return value === 'SAFE' || value === 'CRITICAL' ? value : 'UNKNOWN';
}

function stockoutReason(value: unknown): StockoutReason | null {
  return value === 'NO_USAGE' || value === 'NO_LEADTIME' ? value : null;
}

export function normalizeLeadtimeGap(row: Record<string, unknown>): LeadtimeGap {
  return {
    supplier: String(value(row, ['supplier_name', 'supplier', '법인', '공급처', '공급업체명']) ?? '미정'),
    country: String(value(row, ['country', '국가']) ?? '미정'),
    masterLeadTime: numberValue(row, ['std_lead_time', 'master_lt', 'master_lead_time', 'planned_lead_time', '표준리드타임', '표준리드타임(일)', '마스터값']),
    sampleCount: numberValue(row, ['n_samples', 'sample_count', 'samples', '표본수']) ?? 0,
    actualAverage: numberValue(row, ['mean_days', 'actual_avg', 'actual_average', 'avg_lead_time', '실적평균']),
    p80: numberValue(row, ['p80_days', 'p80', 'P80']),
    gap: numberValue(row, ['gap_days', 'gap', 'leadtime_gap', '격차']),
  };
}

export function normalizeStockoutRisk(row: Record<string, unknown>): StockoutRisk {
  return {
    itemId: stringValue(row, ['item_id', 'item_code', '품목코드'], '미정'),
    itemName: stringValue(row, ['item_name', '품목명'], '미정'),
    supplierId: stringValue(row, ['supplier_id', 'supplier', 'supplier_name', '생산법인', '공급처'], '미정'),
    currentStock: numberValue(row, ['current_stock', 'on_hand', '현재고']),
    inboundQty: numberValue(row, ['inbound_qty', 'inbound', '입고예정', '입고예정량']),
    availableQty: numberValue(row, ['available_qty', 'available', '가용수량']),
    dailyUsageAvg: numberValue(row, ['daily_usage_avg', 'avg_daily_usage', '일평균사용량', '일평균 사용량']),
    cv: numberValue(row, ['cv', '변동계수']),
    plannedLeadTime: numberValue(row, ['planned_lead_time', 'effective_lead_time', 'lead_time', '계획리드타임', '계획 리드타임']),
    stockoutDays: numberValue(row, ['stockout_days', 'days_to_stockout', '소진일수']),
    stockoutDate: value(row, ['stockout_date', '소진예정일']) === null
      ? null
      : String(value(row, ['stockout_date', '소진예정일'])),
    riskStatus: stockoutStatus(value(row, ['risk_status', 'status', '위험상태'])),
    reason: stockoutReason(value(row, ['reason', '사유'])),
  };
}

export function normalizeStockoutKpi(row: Record<string, unknown>): StockoutKpi {
  return {
    nItems: numberValue(row, ['n_items', 'item_count', '품목수']) ?? 0,
    nCritical: numberValue(row, ['n_critical', 'critical_count', '위험품목수']) ?? 0,
    nSafe: numberValue(row, ['n_safe', 'safe_count', '안전품목수']) ?? 0,
    nUnknown: numberValue(row, ['n_unknown', 'unknown_count', '계산불가품목수']) ?? 0,
    nWithin30d: numberValue(row, ['n_within_30d', 'within_30_days', '30일이내소진']) ?? 0,
    avgStockoutDays: numberValue(row, ['avg_stockout_days', 'average_stockout_days', '평균소진일수']),
  };
}

export function normalizeShipmentTrend(row: Record<string, unknown>): ShipmentTrend {
  return {
    itemCode: stringValue(row, ['item_code', 'item_id', '품목코드'], '미정'),
    itemName: nullableStringValue(row, ['item_name', '품목명']),
    period: nullableStringValue(row, ['period', 'month', 'shipment_month', '기준월']),
    shipmentCount: numberValue(row, ['shipment_count', 'n_shipments', 'shipment_cnt', '선적건수']),
    shipmentQty: numberValue(row, ['shipment_qty', 'total_shipment_qty', 'qty', '선적수량']),
    rollingAverage: numberValue(row, ['rolling_average', 'rolling_avg', 'moving_average', '이동평균']),
  };
}

export function normalizeDemandProfileRt(row: Record<string, unknown>): DemandProfileRt {
  return {
    itemCode: stringValue(row, ['item_code', 'item_id', '품목코드'], '미정'),
    itemName: nullableStringValue(row, ['item_name', '품목명']),
    validDays: numberValue(row, ['valid_days', 'n_days', '유효일수']),
    dailyDemandAvg: numberValue(row, ['daily_demand_avg', 'daily_usage_avg', 'avg_daily_demand', '일평균수요']),
    dailyDemandSd: numberValue(row, ['daily_demand_sd', 'daily_usage_sd', 'sd_daily_demand', '일수요표준편차']),
    cv: numberValue(row, ['cv', '변동계수']),
    trend: numberValue(row, ['trend', 'demand_trend', '추세']),
    source: nullableStringValue(row, ['source', '산출근거']),
    reasonCode: nullableStringValue(row, ['reason_code', 'reason', '사유코드']),
  };
}

export function normalizeOlAccuracy(row: Record<string, unknown>): OlAccuracy {
  return {
    modelBase: stringValue(row, ['model_base', 'model_base_name', 'model', '모델베이스'], '미정'),
    period: nullableStringValue(row, ['period', 'month', '기준월']),
    fiscalYear: nullableStringValue(row, ['fiscal_year', 'fy', '회계연도']),
    olQty: numberValue(row, ['ol_qty', 'ol_demand', 'planned_qty', 'ol수량']),
    actualQty: numberValue(row, ['actual_qty', 'actual_demand', 'actual_quantity', '실적수량']),
    accuracy: numberValue(row, ['accuracy', 'accuracy_rate', '정확도']),
    errorQty: numberValue(row, ['error_qty', 'error_quantity', '오차수량']),
    reasonCode: nullableStringValue(row, ['reason_code', 'reason', '사유코드']),
  };
}

export function normalizeBomRequirement(row: Record<string, unknown>): BomRequirement {
  return {
    modelBase: stringValue(row, ['model_base', 'model_base_name', 'model', '모델베이스'], '미정'),
    itemCode: stringValue(row, ['item_code', 'item_id', 'part_code', '품목코드', '부품코드'], '미정'),
    itemName: nullableStringValue(row, ['item_name', 'part_name', '품목명', '부품명']),
    bomQty: numberValue(row, ['bom_qty', 'bom_quantity', 'quantity_per_unit', 'BOM수량']),
    attachmentRate: numberValue(row, ['attachment_rate', 'attach_rate', '장착률']),
    requiredQty: numberValue(row, ['required_qty', 'requirement_qty', 'required_quantity', '소요수량']),
    reasonCode: nullableStringValue(row, ['reason_code', 'reason', '사유코드']),
  };
}
