import PageHeader from '@/components/shell/page-header';
import Panel from '@/components/ui/panel';
import { getForecastModels } from '@/lib/forecast-engine';
import ModelRow from './model-row';

export const dynamic = 'force-dynamic';

export default async function ForecastModelsPage() {
  const { rows, error } = await getForecastModels();
  return <><PageHeader eyebrow="ADMIN" title="Forecast 모델" description="SQL Baseline 모델의 활성화 상태와 실행 파라미터를 확인합니다." />
    <Panel title="Model Registry" meta="파라미터는 core.model_config에서 관리"><p className="muted">모델을 비활성화하면 다음 Forecast 실행부터 제외됩니다. 과거 실행의 모델 정의는 Snapshot으로 보존됩니다.</p>{error ? <p className="text-danger">조회에 실패했습니다: {error}</p> : rows.length === 0 ? <p className="muted">등록된 모델이 없습니다.</p> : <div className="scm-data-table-wrap"><table className="scm-data-table"><thead><tr><th>Model ID</th><th>모델명</th><th>Family</th><th>Engine</th><th>Version</th><th>Enabled</th><th>Demand Type</th><th>Parameters</th><th>작업</th></tr></thead><tbody>{rows.map((model) => <ModelRow key={model.modelId} model={model} />)}</tbody></table></div>}</Panel>
  </>;
}
