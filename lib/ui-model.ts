export const STATUS_VALUES = ['SAFE', 'WARNING', 'CRITICAL', 'CALCULATION_UNAVAILABLE'] as const;

export type Status = (typeof STATUS_VALUES)[number];
export type StatusTone = 'green' | 'amber' | 'red' | 'gray';

const STATUS_TONES: Record<Status, StatusTone> = {
  SAFE: 'green',
  WARNING: 'amber',
  CRITICAL: 'red',
  CALCULATION_UNAVAILABLE: 'gray',
};

export function statusTone(status: Status): StatusTone {
  return STATUS_TONES[status];
}

export function formatEmptyValue(value: unknown, reasonCode?: string | null): string {
  if (value === null || value === undefined || value === '') {
    return reasonCode ? `— + ${reasonCode}` : '—';
  }
  return String(value);
}

export function isStatus(value: string): value is Status {
  return (STATUS_VALUES as readonly string[]).includes(value);
}
