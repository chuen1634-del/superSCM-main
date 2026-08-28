import PageHeader from '@/components/shell/page-header';
import Badge from '@/components/ui/badge';
import EmptyValue from '@/components/ui/empty-value';
import Panel from '@/components/ui/panel';
import { getForecastRuns } from '@/lib/forecast-engine';
import { runBaselineForecastAction } from './actions';
import type { ForecastRunStatus } from '@/lib/forecast-engine-model';

export const dynamic = 'force-dynamic';
const statusTone: Record<ForecastRunStatus, 'SAFE' | 'WARNING' | 'CRITICAL'> = { SUCCESS: 'SAFE', RUNNING: 'WARNING', FAILED: 'CRITICAL' };

export default async function ForecastRunsPage() {
  const { rows, error } = await getForecastRuns();
  return <><PageHeader eyebrow="ADMIN" title="Forecast 실행 이력" description="Baseline Forecast 실행 결과와 데이터 변경에 따른 stale 상태를 확인합니다." actions={<form action={runBaselineForecastAction} className="button-row"><button className="button primary" type="submit">Baseline Forecast 실행</button></form>} />
    <Panel title="최근 실행" meta="실행 시점의 model version snapshot 사용"><p className="muted">Forecast 실행은 학습기간과 활성화된 모델 설정을 기준으로 서버에서 처리합니다.</p>{error ? <p className="text-danger">조회에 실패했습니다: {error}</p> : rows.length === 0 ? <p className="muted">실행 이력이 없습니다.</p> : <div className="scm-data-table-wrap"><table className="scm-data-table"><thead><tr><th>Run ID</th><th>상태</th><th>실행시간</th><th>모델 수</th><th>SKU 수</th><th>결과 행</th><th>Data Snapshot</th><th>Stale</th><th>실행자</th></tr></thead><tbody>{rows.map((run) => <tr key={run.runId}><td>{run.runId}</td><td><Badge status={statusTone[run.status]}>{run.status}</Badge></td><td>{run.startedAt ?? <EmptyValue value={null} reasonCode="NO_START_TIME" />}</td><td>{run.nModels}</td><td>{run.nItems}</td><td>{run.nRows}</td><td>{run.dataSnapshotAt ?? <EmptyValue value={null} reasonCode="NO_SNAPSHOT" />}</td><td>{run.isStale === null ? <EmptyValue value={null} reasonCode="NO_SNAPSHOT" /> : run.isStale ? <Badge status="WARNING">STALE</Badge> : <Badge status="SAFE">FRESH</Badge>}</td><td>{run.triggeredEmail ?? <EmptyValue value={null} reasonCode="NO_ACTOR" />}</td></tr>)}</tbody></table></div>}</Panel>
  </>;
}
