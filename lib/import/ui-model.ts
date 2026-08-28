import type { BatchStatus, ImportMode } from './types.ts';

export type WizardState =
  | 'SELECT_FILE'
  | 'SELECT_TYPE'
  | 'PREVIEW'
  | 'MAPPING'
  | 'VALIDATING'
  | 'RESULT'
  | 'CONFIRM'
  | 'IMPORTED';

export function canImportBatch(
  status: BatchStatus,
  errorRows: number,
  replaceConfirmed: boolean,
  mode: ImportMode = 'append',
): boolean {
  return status === 'VALIDATED'
    && errorRows === 0
    && (mode !== 'replace' || replaceConfirmed);
}

export function nextWizardState(
  current: WizardState,
  validationStatus?: 'SUCCESS' | 'WARNING' | 'ERROR',
): WizardState {
  if (current === 'PREVIEW') return 'MAPPING';
  if (current === 'MAPPING') return 'VALIDATING';
  if (current === 'VALIDATING') return validationStatus === 'ERROR' ? 'RESULT' : 'CONFIRM';
  if (current === 'RESULT' && validationStatus !== 'ERROR') return 'CONFIRM';
  if (current === 'CONFIRM') return 'IMPORTED';
  return current;
}
