import test from 'node:test';
import assert from 'node:assert/strict';
import { IMPORT_SCHEMAS, isSupportedImportType } from './schema.ts';

test('실제 raw 입력 타입만 지원한다', () => {
  assert.equal(isSupportedImportType('usage_history'), true);
  assert.equal(isSupportedImportType('sales_order'), true);
  assert.equal(isSupportedImportType('forecast'), false);
});

test('usage history는 표준 필수 컬럼을 가진다', () => {
  assert.ok(IMPORT_SCHEMAS.usage_history.required.includes('item_id'));
  assert.ok(IMPORT_SCHEMAS.usage_history.required.includes('use_date'));
  assert.ok(IMPORT_SCHEMAS.usage_history.required.includes('qty'));
});
