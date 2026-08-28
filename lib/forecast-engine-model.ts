export type ForecastRunStatus = 'RUNNING' | 'SUCCESS' | 'FAILED';

export type ForecastModelConfig = {
  modelId: string;
  modelName: string;
  family: string;
  engine: string;
  version: string;
  enabled: boolean;
  isDefault: boolean;
  applicableDemandType: string[];
  parameters: Record<string, unknown>;
  description: string | null;
};

export type ForecastRun = {
  runId: string;
  status: ForecastRunStatus;
  granularity: string | null;
  trainStart: string | null;
  trainEnd: string | null;
  horizon: number | null;
  championMetric: string | null;
  dataSnapshotAt: string | null;
  nModels: number;
  nItems: number;
  nRows: number;
  startedAt: string | null;
  finishedAt: string | null;
  durationMs: number | null;
  triggeredBy: string | null;
  triggeredEmail: string | null;
  note: string | null;
  message: string | null;
  isStale: boolean | null;
};

export function normalizeForecastModel(row: Record<string, unknown>): ForecastModelConfig {
  return {
    modelId: String(value(row, ['model_id']) ?? '미정'),
    modelName: String(value(row, ['model_name']) ?? '미정'),
    family: String(value(row, ['family']) ?? '미정'),
    engine: String(value(row, ['engine']) ?? '미정'),
    version: String(value(row, ['version']) ?? '미정'),
    enabled: row.enabled === true,
    isDefault: row.is_default === true,
    applicableDemandType: Array.isArray(row.applicable_demand_type) ? row.applicable_demand_type.map(String) : [],
    parameters: row.parameters && typeof row.parameters === 'object' ? row.parameters as Record<string, unknown> : {},
    description: stringValue(row, ['description']),
  };
}

function value(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== '') return row[key];
  }
  return null;
}

function numberValue(row: Record<string, unknown>, keys: string[]) {
  const raw = value(row, keys);
  if (raw === null) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function stringValue(row: Record<string, unknown>, keys: string[]) {
  const raw = value(row, keys);
  return raw === null ? null : String(raw);
}

function statusValue(valueToCheck: unknown): ForecastRunStatus {
  return valueToCheck === 'RUNNING' || valueToCheck === 'SUCCESS' || valueToCheck === 'FAILED' ? valueToCheck : 'FAILED';
}

export function formatForecastValue(valueToFormat: number | null, reasonCode: string | null): string {
  return valueToFormat === null ? `— + ${reasonCode ?? 'CALCULATION_UNAVAILABLE'}` : String(valueToFormat);
}

export function isForecastStale(dataSnapshotAt: string | null, sourceUpdatedAt: string | null): boolean | null {
  if (!dataSnapshotAt || !sourceUpdatedAt) return null;
  return new Date(sourceUpdatedAt).getTime() > new Date(dataSnapshotAt).getTime();
}

export function normalizeForecastRun(row: Record<string, unknown>): ForecastRun {
  return {
    runId: stringValue(row, ['run_id']) ?? '미정',
    status: statusValue(value(row, ['status'])),
    granularity: stringValue(row, ['granularity']),
    trainStart: stringValue(row, ['train_start']),
    trainEnd: stringValue(row, ['train_end']),
    horizon: numberValue(row, ['horizon']),
    championMetric: stringValue(row, ['champion_metric']),
    dataSnapshotAt: stringValue(row, ['data_snapshot_at']),
    nModels: numberValue(row, ['n_models']) ?? 0,
    nItems: numberValue(row, ['n_items']) ?? 0,
    nRows: numberValue(row, ['n_rows']) ?? 0,
    startedAt: stringValue(row, ['started_at']),
    finishedAt: stringValue(row, ['finished_at']),
    durationMs: numberValue(row, ['duration_ms']),
    triggeredBy: stringValue(row, ['triggered_by']),
    triggeredEmail: stringValue(row, ['triggered_email']),
    note: stringValue(row, ['note']),
    message: stringValue(row, ['message']),
    isStale: typeof row.is_stale === 'boolean' ? row.is_stale : null,
  };
}
