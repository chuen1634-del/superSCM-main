import PageHeader from '@/components/shell/page-header';
import EmptyValue from '@/components/ui/empty-value';
import KpiCard from '@/components/ui/kpi-card';
import Panel from '@/components/ui/panel';
import DemandProfileTable from './demand-profile-table';
import { getDemandProfileKpi, getDemandProfiles } from '@/lib/scm';

export const dynamic = 'force-dynamic';

export default async function DemandProfilePage() {
  const [{ rows, error: profileError }, { data: kpi, error: kpiError }] = await Promise.all([getDemandProfiles(), getDemandProfileKpi()]);
  return <>
    <PageHeader title="SKU 수요 프로파일" description="학습 구간의 월별 수요 특성을 분석해 STEP 6 Forecast 모델 후보를 준비합니다." />
    {profileError || kpiError ? <Panel><p className="text-danger">조회에 실패했습니다.</p>{profileError ? <p className="muted">Demand Profile: {profileError}</p> : null}{kpiError ? <p className="muted">Demand Profile KPI: {kpiError}</p> : null}</Panel> : <>
      <div className="grid grid-4">
        <KpiCard label="전체 SKU" value={kpi ? kpi.totalItems : <EmptyValue value={null} reasonCode="NO_KPI" />} unit={kpi ? '개' : undefined} foot="학습기간 기준" />
        <KpiCard label="SMOOTH" value={kpi ? kpi.nSmooth : <EmptyValue value={null} reasonCode="NO_KPI" />} unit={kpi ? '개' : undefined} foot="규칙적 수요" tone="good" />
        <KpiCard label="Croston 후보" value={kpi ? kpi.nCrostonNeeded : <EmptyValue value={null} reasonCode="NO_KPI" />} unit={kpi ? '개' : undefined} foot="INTERMITTENT + LUMPY" tone="warn" />
        <KpiCard label="계산 불가" value={kpi ? kpi.nCalculationUnavailable : <EmptyValue value={null} reasonCode="NO_KPI" />} unit={kpi ? '개' : undefined} foot="reason code 확인 필요" tone="danger" />
      </div>
      <Panel title="SKU별 수요 특성" meta="Syntetos-Boylan-Croston 기준" className="section"><DemandProfileTable rows={rows} /></Panel>
    </>}
  </>;
}
