import test from 'node:test';
import assert from 'node:assert/strict';
import { canChangeOwnAccount, normalizeRole } from './auth-model.ts';

test('알 수 없는 role은 권한으로 인정하지 않는다', () => { assert.equal(normalizeRole('OWNER'), null); });
test('자신의 관리자 권한과 active는 유지해야 한다', () => {
  assert.equal(canChangeOwnAccount('a', 'a', 'ADMIN', true), true);
  assert.equal(canChangeOwnAccount('a', 'a', 'USER', true), false);
  assert.equal(canChangeOwnAccount('a', 'a', 'ADMIN', false), false);
});
