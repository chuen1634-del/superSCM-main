import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('공통 Topbar는 로그아웃 Server Action을 연결한다', () => {
  const source = readFileSync(new URL('../components/shell/topbar.tsx', import.meta.url), 'utf8');
  assert.match(source, /logoutAction/);
  assert.match(source, /<form action=\{logoutAction\}>/);
});
