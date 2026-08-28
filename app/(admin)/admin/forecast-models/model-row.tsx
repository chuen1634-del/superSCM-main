import type { ForecastModelConfig } from '@/lib/forecast-engine-model';
import { toggleForecastModelAction } from './actions';

export default function ModelRow({ model }: { model: ForecastModelConfig }) {
  return <tr><td>{model.modelId}</td><td>{model.modelName}</td><td>{model.family}</td><td>{model.engine}</td><td>{model.version}</td><td>{model.enabled ? 'ON' : 'OFF'}</td><td>{model.applicableDemandType.join(', ') || '—'}</td><td><code>{JSON.stringify(model.parameters)}</code></td><td><form action={toggleForecastModelAction}><input type="hidden" name="model_id" value={model.modelId} /><input type="hidden" name="enabled" value={String(!model.enabled)} /><button className="button" type="submit">{model.enabled ? '비활성화' : '활성화'}</button></form></td></tr>;
}
