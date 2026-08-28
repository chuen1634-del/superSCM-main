import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { formatEmptyValue, STATUS_VALUES, statusTone } from './ui-model.ts';
import { getMenuForRole } from './menu.ts';

test('계산 불가 값은 reason code를 포함한다', () => {
  assert.equal(formatEmptyValue(null, 'NO_USAGE'), '— + NO_USAGE');
});

test('사용자와 관리자 메뉴를 분리한다', () => {
  assert.ok(getMenuForRole('USER').every((item) => item.href !== '/admin'));
  assert.ok(getMenuForRole('ADMIN').some((item) => item.href === '/admin'));
});

test('관리자 메뉴는 사용자 메뉴와 관리자 메뉴를 함께 표시한다', () => {
  const adminHrefs = getMenuForRole('ADMIN').map((item) => item.href);
  assert.ok(adminHrefs.includes('/analysis/leadtime'));
  assert.ok(adminHrefs.includes('/analysis/stockout'));
  assert.ok(adminHrefs.includes('/analysis/demand-profile'));
  assert.ok(adminHrefs.includes('/workflow'));
});

test('기존 업무 화면 메뉴는 route group이 만든 실제 URL을 사용한다', () => {
  assert.ok(getMenuForRole('ADMIN').some((item) => item.label === '기존 업무 화면' && item.href === '/workflow'));
});

test('관리자 레이아웃은 ADMIN 통합 메뉴를 Sidebar에 전달한다', () => {
  const source = readFileSync('app/(admin)/layout.tsx', 'utf8');
  assert.match(source, /getMenuForRole\('ADMIN'\)/);
});

test('Sidebar 메뉴 key는 동일한 href를 구분한다', () => {
  const source = readFileSync('components/shell/sidebar.tsx', 'utf8');
  assert.match(source, /key=\{`\$\{item\.href\}-\$\{item\.label\}`\}/);
});

test('상태 이름은 네 가지로 고정된다', () => {
  assert.deepEqual(STATUS_VALUES, ['SAFE', 'WARNING', 'CRITICAL', 'CALCULATION_UNAVAILABLE']);
});

test('계산 불가 상태는 gray tone을 사용한다', () => {
  assert.equal(statusTone('CALCULATION_UNAVAILABLE'), 'gray');
});

test('주요 route group 페이지가 존재한다', () => {
  for (const file of ['app/(user)/page.tsx', 'app/(admin)/admin/page.tsx', 'app/(auth)/login/page.tsx', 'app/(legacy)/workflow/page.tsx', 'app/(admin)/admin/forecast-run/page.tsx']) {
    assert.equal(existsSync(file), true, file);
  }
});
