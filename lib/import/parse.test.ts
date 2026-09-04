import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFile } from './parse.ts';

test('CSV를 헤더 기반 행으로 파싱하고 표준 컬럼을 추정한다', async () => {
  const file = new File(
    ['사용이력번호,품목코드,사용일,수량\nU001,ITEM001,2026-01-02,12\n'],
    'usage.csv',
    { type: 'text/csv' },
  );

  const result = await parseFile(file, 'usage_history');

  assert.deepEqual(result.headers, ['사용이력번호', '품목코드', '사용일', '수량']);
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].품목코드, 'ITEM001');
  assert.equal(result.mappings.find((mapping) => mapping.sourceHeader === '품목코드')?.targetColumn, 'item_id');
});

test('지원하지 않는 파일 확장자는 거부한다', async () => {
  const file = new File(['hello'], 'usage.txt', { type: 'text/plain' });
  await assert.rejects(() => parseFile(file, 'usage_history'), /CSV 또는 Excel/);
});
