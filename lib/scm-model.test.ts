import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeBomRequirement,
  normalizeDemandProfileRt,
  normalizeLeadtimeGap,
  normalizeOlAccuracy,
  normalizeShipmentTrend,
  normalizeStockoutKpi,
  normalizeStockoutRisk,
} from './scm-model.ts';

test('normalizes a shipment trend row and preserves missing values as null', () => {
  assert.deepEqual(normalizeShipmentTrend({
    item_code: '602K02693',
    month: '2026-08',
    shipment_count: 40,
    shipment_qty: '779.0',
    rolling_avg: 772.3,
  }), {
    itemCode: '602K02693',
    itemName: null,
    period: '2026-08',
    shipmentCount: 40,
    shipmentQty: 779,
    rollingAverage: 772.3,
  });
});

test('normalizes demand profile, OL accuracy, and BOM requirement rows', () => {
  assert.deepEqual(normalizeDemandProfileRt({ 품목코드: '602K02693', 일평균수요: 12.5, reason_code: 'NO_USAGE' }), {
    itemCode: '602K02693', itemName: null, validDays: null, dailyDemandAvg: 12.5,
    dailyDemandSd: null, cv: null, trend: null, source: null, reasonCode: 'NO_USAGE',
  });
  assert.deepEqual(normalizeOlAccuracy({ model_base: 'A', fiscal_year: 'FY26', accuracy: 0.92, reason_code: null }), {
    modelBase: 'A', period: null, fiscalYear: 'FY26', olQty: null, actualQty: null,
    accuracy: 0.92, errorQty: null, reasonCode: null,
  });
  assert.deepEqual(normalizeBomRequirement({ model_base: 'A', item_code: 'P1', requirement_qty: 4, reason_code: 'NO_BOM' }), {
    modelBase: 'A', itemCode: 'P1', itemName: null, bomQty: null, attachmentRate: null,
    requiredQty: 4, reasonCode: 'NO_BOM',
  });
});

test('normalizes analytics leadtime rows into the screen model', () => {
  const result = normalizeLeadtimeGap({
    supplier_name: 'Fujifilm BI India',
    country: 'India',
    master_lt: 32,
    sample_count: 159,
    actual_avg: 37.6,
    p80: 44,
    gap: 12,
  });

  assert.deepEqual(result, {
    supplier: 'Fujifilm BI India',
    country: 'India',
    masterLeadTime: 32,
    sampleCount: 159,
    actualAverage: 37.6,
    p80: 44,
    gap: 12,
  });
});

test('uses Korean view aliases and safe defaults', () => {
  const result = normalizeLeadtimeGap({ 법인: 'Japan', 국가: 'Japan', 표준리드타임: 7, 표본수: 278, 실적평균: 14.5, P80: 18, 격차: 11 });
  assert.equal(result.supplier, 'Japan');
  assert.equal(result.masterLeadTime, 7);
  assert.equal(result.p80, 18);
  assert.equal(result.gap, 11);
});

test('reads the real analytics.v_leadtime_gap column names', () => {
  const result = normalizeLeadtimeGap({
    supplier_name: 'Fujifilm BI China',
    country: 'China',
    std_lead_time: 25,
    n_samples: 210,
    mean_days: 28.4,
    p80_days: 33,
    gap_days: 8,
  });

  assert.deepEqual(result, {
    supplier: 'Fujifilm BI China',
    country: 'China',
    masterLeadTime: 25,
    sampleCount: 210,
    actualAverage: 28.4,
    p80: 33,
    gap: 8,
  });
});

test('normalizes analytics stockout risk rows into the screen model', () => {
  const result = normalizeStockoutRisk({
    item_id: 'ITEM012',
    item_name: '토너 카트리지',
    supplier_id: 'SUP003',
    current_stock: 723,
    inbound_qty: 361,
    available_qty: 1084,
    daily_usage_avg: 60.22,
    cv: 0.18,
    planned_lead_time: 18,
    stockout_days: 18.0,
    stockout_date: '2026-09-14',
    risk_status: 'CRITICAL',
    reason: null,
  });

  assert.deepEqual(result, {
    itemId: 'ITEM012',
    itemName: '토너 카트리지',
    supplierId: 'SUP003',
    currentStock: 723,
    inboundQty: 361,
    availableQty: 1084,
    dailyUsageAvg: 60.22,
    cv: 0.18,
    plannedLeadTime: 18,
    stockoutDays: 18,
    stockoutDate: '2026-09-14',
    riskStatus: 'CRITICAL',
    reason: null,
  });
});

test('keeps missing stockout inputs as null with an explicit reason', () => {
  const result = normalizeStockoutRisk({
    품목코드: 'ITEM020',
    품목명: '사용 이력 없음',
    생산법인: 'SUP010',
    현재고: '40',
    입고예정: '0',
    가용수량: '40',
    일평균사용량: null,
    계획리드타임: '22',
    소진일수: null,
    소진예정일: null,
    위험상태: 'UNKNOWN',
    사유: 'NO_USAGE',
  });

  assert.equal(result.itemId, 'ITEM020');
  assert.equal(result.availableQty, 40);
  assert.equal(result.stockoutDays, null);
  assert.equal(result.stockoutDate, null);
  assert.equal(result.riskStatus, 'UNKNOWN');
  assert.equal(result.reason, 'NO_USAGE');
});

test('normalizes stockout KPI values without replacing an unavailable average', () => {
  const result = normalizeStockoutKpi({
    n_items: 20,
    n_critical: 4,
    n_safe: 14,
    n_unknown: 2,
    n_within_30d: 5,
    avg_stockout_days: null,
  });

  assert.deepEqual(result, {
    nItems: 20,
    nCritical: 4,
    nSafe: 14,
    nUnknown: 2,
    nWithin30d: 5,
    avgStockoutDays: null,
  });
});
