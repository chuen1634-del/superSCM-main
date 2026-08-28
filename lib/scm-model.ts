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

export type DemandType = 'SMOOTH' | 'INTERMITTENT' | 'ERRATIC' | 'LUMPY';

export type DemandProfile = {
  itemId: string;
  itemName: string;
  nPeriods: number;
  nNonzeroPeriods: number;
  adi: number | null;
  cv: number | null;
  cvSquared: number | null;
  zeroDemandRate: number | null;
  trend: number | null;
  recentChangeRate: number | null;
  peakPeriod: string | null;
  demandType: DemandType | null;
  seasonality: string | null;
  reasonCode: string | null;
  stability: string | null;
};

export type DemandProfileKpi = {
  totalItems: number;
  nSmooth: number;
  nIntermittent: number;
  nErratic: number;
  nLumpy: number;
  nCrostonNeeded: number;
  nCalculationUnavailable: number;
};

export type DemandAvailability = 'ALL' | 'AVAILABLE' | 'UNAVAILABLE';
export type DemandProfileFilter = { demandType: DemandType | 'ALL'; availability: DemandAvailability; search: string };

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

function demandTypeValue(valueToCheck: unknown): DemandType | null {
  return valueToCheck === 'SMOOTH' || valueToCheck === 'INTERMITTENT' || valueToCheck === 'ERRATIC' || valueToCheck === 'LUMPY'
    ? valueToCheck
    : null;
}

export function normalizeDemandProfile(row: Record<string, unknown>): DemandProfile {
  return {
    itemId: stringValue(row, ['item_id', 'item_code', '품목코드'], '미정'),
    itemName: stringValue(row, ['item_name', '품목명'], '미정'),
    nPeriods: numberValue(row, ['n_periods', 'period_count']) ?? 0,
    nNonzeroPeriods: numberValue(row, ['n_nonzero_periods', 'nonzero_period_count']) ?? 0,
    adi: numberValue(row, ['adi']),
    cv: numberValue(row, ['cv']),
    cvSquared: numberValue(row, ['cv_squared', 'cv2']),
    zeroDemandRate: numberValue(row, ['zero_demand_rate']),
    trend: numberValue(row, ['trend', 'trend_per_period']),
    recentChangeRate: numberValue(row, ['recent_change_rate', 'recent_change_rate_pct']),
    peakPeriod: value(row, ['peak_period', 'peak_month']) === null ? null : String(value(row, ['peak_period', 'peak_month'])),
    demandType: demandTypeValue(value(row, ['demand_type'])),
    seasonality: value(row, ['seasonality']) === null ? null : String(value(row, ['seasonality'])),
    reasonCode: value(row, ['reason_code', 'reason']) === null ? null : String(value(row, ['reason_code', 'reason'])),
    stability: value(row, ['stability']) === null ? null : String(value(row, ['stability'])),
  };
}

export function normalizeDemandProfileKpi(row: Record<string, unknown>): DemandProfileKpi {
  return {
    totalItems: numberValue(row, ['total_items']) ?? 0,
    nSmooth: numberValue(row, ['n_smooth']) ?? 0,
    nIntermittent: numberValue(row, ['n_intermittent']) ?? 0,
    nErratic: numberValue(row, ['n_erratic']) ?? 0,
    nLumpy: numberValue(row, ['n_lumpy']) ?? 0,
    nCrostonNeeded: numberValue(row, ['n_croston_needed']) ?? 0,
    nCalculationUnavailable: numberValue(row, ['n_calculation_unavailable']) ?? 0,
  };
}

export function demandTypeLabel(type: DemandType): string {
  return type;
}

export function filterDemandProfiles(rows: DemandProfile[], filter: DemandProfileFilter): DemandProfile[] {
  const search = filter.search.trim().toUpperCase();
  return rows.filter((row) => {
    const matchesType = filter.demandType === 'ALL' || row.demandType === filter.demandType;
    const available = row.reasonCode === null;
    const matchesAvailability = filter.availability === 'ALL'
      || (filter.availability === 'AVAILABLE' ? available : !available);
    const matchesSearch = !search || row.itemId.toUpperCase().includes(search) || row.itemName.toUpperCase().includes(search);
    return matchesType && matchesAvailability && matchesSearch;
  });
}
