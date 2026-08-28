import test from 'node:test';
import assert from 'node:assert/strict';
import {
  demandTypeLabel,
  filterDemandProfiles,
  normalizeDemandProfile,
  type DemandProfile,
} from './demand-profile-model.ts';

test('Demand Type은 STEP 6 호환 코드와 한글 표시를 분리한다', () => {
  assert.equal(demandTypeLabel('SMOOTH'), 'SMOOTH');
  assert.equal(demandTypeLabel('INTERMITTENT'), 'INTERMITTENT');
  assert.equal(demandTypeLabel('ERRATIC'), 'ERRATIC');
  assert.equal(demandTypeLabel('LUMPY'), 'LUMPY');
});

test('계산 불가 profile은 null과 reason code를 보존한다', () => {
  const profile = normalizeDemandProfile({
    item_id: 'ITEM020', item_name: '테스트 품목', n_periods: 12,
    n_nonzero_periods: 0, adi: null, cv: null, cv_squared: null,
    zero_demand_rate: 1, trend: null, recent_change_rate: null,
    peak_period: null, demand_type: null, seasonality: null,
    reason_code: 'NO_DEMAND', stability: null,
  });
  assert.equal(profile.adi, null);
  assert.equal(profile.reasonCode, 'NO_DEMAND');
});

test('필터는 저장된 결과만 대상으로 SKU와 계산 가능 여부를 적용한다', () => {
  const rows: DemandProfile[] = [
    normalizeDemandProfile({ item_id: 'ITEM001', item_name: 'A', demand_type: 'SMOOTH', reason_code: null }),
    normalizeDemandProfile({ item_id: 'ITEM002', item_name: 'B', demand_type: null, reason_code: 'NO_DEMAND' }),
  ];
  assert.deepEqual(filterDemandProfiles(rows, { demandType: 'ALL', availability: 'UNAVAILABLE', search: '002' }).map((row) => row.itemId), ['ITEM002']);
  assert.deepEqual(filterDemandProfiles(rows, { demandType: 'SMOOTH', availability: 'ALL', search: '' }).map((row) => row.itemId), ['ITEM001']);
});
