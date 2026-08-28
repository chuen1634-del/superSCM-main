import test from 'node:test';
import assert from 'node:assert/strict';
import { validateRows } from './validate.ts';

const context = {
  batchId: 'batch-1',
  knownItemIds: new Set(['ITEM001']),
  knownSupplierIds: new Set(['SUP001']),
  existingKeys: new Set<string>(),
};

test('정상 usage history 행은 성공으로 검증한다', async () => {
  const result = await validateRows('usage_history', [
    { usage_id: 'U001', item_id: 'ITEM001', use_date: '2026-01-02', qty: '12' },
  ], context);

  assert.equal(result.status, 'SUCCESS');
  assert.equal(result.successRows, 1);
  assert.equal(result.issues.length, 0);
});

test('필수값 누락과 잘못된 날짜는 오류로 남긴다', async () => {
  const result = await validateRows('usage_history', [
    { usage_id: 'U002', item_id: '', use_date: '2026-99-99', qty: '2' },
  ], context);

  assert.equal(result.status, 'ERROR');
  assert.deepEqual(
    result.issues.map((issue) => issue.errorCode).sort(),
    ['INVALID_DATE', 'REQUIRED_VALUE_MISSING'],
  );
});

test('알 수 없는 품목과 음수 수량은 오류로 남긴다', async () => {
  const result = await validateRows('usage_history', [
    { usage_id: 'U003', item_id: 'ITEM999', use_date: '2026-01-02', qty: '-3' },
  ], context);

  assert.equal(result.status, 'ERROR');
  assert.deepEqual(
    result.issues.map((issue) => issue.errorCode).sort(),
    ['NEGATIVE_VALUE', 'UNKNOWN_ITEM'],
  );
});

test('동일 자연키는 duplicate 오류로 탐지한다', async () => {
  const result = await validateRows('usage_history', [
    { usage_id: 'U004', item_id: 'ITEM001', use_date: '2026-01-02', qty: '1' },
    { usage_id: 'U004', item_id: 'ITEM001', use_date: '2026-01-03', qty: '2' },
  ], context);

  assert.equal(result.errorRows, 1);
  assert.equal(result.issues.some((issue) => issue.errorCode === 'DUPLICATE_SOURCE_RECORD'), true);
});
