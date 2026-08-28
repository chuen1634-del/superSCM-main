import test from 'node:test';
import assert from 'node:assert/strict';
import { formatForecastValue, isForecastStale, normalizeForecastRun, type ForecastRun } from './forecast-engine-model.ts';

test('Forecast 결과의 계산 불가 값은 null과 reason code를 보존한다', () => {
  assert.equal(formatForecastValue(null, 'INSUFFICIENT_HISTORY'), '— + INSUFFICIENT_HISTORY');
  assert.equal(formatForecastValue(12.5, null), '12.5');
});

test('snapshot 시점 이후 원천 데이터가 있으면 run은 stale다', () => {
  assert.equal(isForecastStale('2026-08-01T00:00:00Z', '2026-08-02T00:00:00Z'), true);
  assert.equal(isForecastStale('2026-08-02T00:00:00Z', '2026-08-01T00:00:00Z'), false);
  assert.equal(isForecastStale(null, '2026-08-01T00:00:00Z'), null);
});

test('run view 컬럼을 화면 모델로 정규화한다', () => {
  const run: ForecastRun = normalizeForecastRun({ run_id: 'run-1', status: 'SUCCESS', n_models: 2, n_items: 20, n_rows: 240, is_stale: true });
  assert.equal(run.runId, 'run-1');
  assert.equal(run.status, 'SUCCESS');
  assert.equal(run.isStale, true);
});
