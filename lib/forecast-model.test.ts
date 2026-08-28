import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { coverageStatus } from './forecast-model.ts';

test('train과 test window가 모두 정상일 때 ready 상태다', () => {
  assert.equal(coverageStatus({ trainWindowOk: true, testWindowOk: true }), 'READY');
});

test('기간이 설정되지 않으면 unconfigured 상태다', () => {
  assert.equal(coverageStatus({ trainWindowOk: null, testWindowOk: null }), 'UNCONFIGURED');
});

test('하나라도 기간이 맞지 않으면 invalid 상태다', () => {
  assert.equal(coverageStatus({ trainWindowOk: true, testWindowOk: false }), 'INVALID');
});

test('forecast 코드에는 raw usage history 직접 조회가 없다', () => {
  const source = readFileSync('lib/forecast-model.ts', 'utf8');
  assert.equal(source.includes('raw.usage_history'), false);
});
