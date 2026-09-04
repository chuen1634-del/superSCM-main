import test from 'node:test';
import assert from 'node:assert/strict';
import { canImportBatch, nextWizardState } from './ui-model.ts';

test('검증 전과 오류가 있는 batch는 Import할 수 없다', () => {
  assert.equal(canImportBatch('STAGED', 0, false), false);
  assert.equal(canImportBatch('VALIDATED', 1, false), false);
  assert.equal(canImportBatch('VALIDATED', 0, false), true);
});

test('replace는 사용자 확인 전 Import할 수 없다', () => {
  assert.equal(canImportBatch('VALIDATED', 0, false, 'replace'), false);
  assert.equal(canImportBatch('VALIDATED', 0, true, 'replace'), true);
});

test('wizard 단계는 validation 결과에 따라 이동한다', () => {
  assert.equal(nextWizardState('PREVIEW'), 'MAPPING');
  assert.equal(nextWizardState('MAPPING'), 'VALIDATING');
  assert.equal(nextWizardState('VALIDATING', 'ERROR'), 'RESULT');
  assert.equal(nextWizardState('VALIDATING', 'SUCCESS'), 'CONFIRM');
});
