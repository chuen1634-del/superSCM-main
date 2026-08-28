import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { formatEmptyValue, STATUS_VALUES, statusTone } from './ui-model.ts';
import { getMenuForRole } from './menu.ts';

test('계산 불가 값은 reason code를 포함한다', () => {
  assert.equal(formatEmptyValue(null, 'NO_USAGE'), '— + NO_USAGE');
});

test('사용자와 관리자 메뉴를 분리한다', () => {
  assert.ok(getMenuForRole('USER').every((item) => item.href !== '/admin'));
  assert.ok(getMenuForRole('ADMIN').some((item) => item.href === '/admin'));
});

test('상태 이름은 네 가지로 고정된다', () => {
  assert.deepEqual(STATUS_VALUES, ['SAFE', 'WARNING', 'CRITICAL', 'CALCULATION_UNAVAILABLE']);
});

test('계산 불가 상태는 gray tone을 사용한다', () => {
  assert.equal(statusTone('CALCULATION_UNAVAILABLE'), 'gray');
});

test('주요 route group 페이지가 존재한다', () => {
  for (const file of ['app/(user)/page.tsx', 'app/(admin)/admin/page.tsx', 'app/(auth)/login/page.tsx', 'app/(legacy)/workflow/page.tsx']) {
    assert.equal(existsSync(file), true, file);
  }
});
