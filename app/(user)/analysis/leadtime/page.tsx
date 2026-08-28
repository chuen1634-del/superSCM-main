import PageHeader from '@/components/shell/page-header';
import DataTable, { type UiColumn } from '@/components/ui/data-table';
import EmptyValue from '@/components/ui/empty-value';
import KpiCard from '@/components/ui/kpi-card';
import Panel from '@/components/ui/panel';
import { getLeadtimeGap } from '@/lib/scm';
import type { LeadtimeGap } from '@/lib/scm-model';

export const dynamic = 'force-dynamic';

function NumberCell({ value, unit, reasonCode }: { value: number | null; unit: string; reasonCode?: string }) {
  return value === null ? <EmptyValue value={value} reasonCode={reasonCode} /> : <span>{Number.isInteger(value) ? value : value.toFixed(1)}{unit}</span>;
}

const columns: UiColumn<LeadtimeGap>[] = [
  { key: 'supplier', label: '공급처' }, { key: 'country', label: '국가' },
  { key: 'masterLeadTime', label: '마스터', align: 'right', render: (r) => <NumberCell value={r.masterLeadTime} unit="일" reasonCode="NO_LEADTIME" /> },
  { key: 'sampleCount', label: '표본수', align: 'right', render: (r) => r.sampleCount.toLocaleString() },
  { key: 'actualAverage', label: '실적평균', align: 'right', render: (r) => <NumberCell value={r.actualAverage} unit="일" reasonCode="NO_USAGE" /> },
  { key: 'p80', label: 'P80', align: 'right', render: (r) => <NumberCell value={r.p80} unit="일" reasonCode="NO_USAGE" /> },
  { key: 'gap', label: '격차', align: 'right', render: (r) => r.gap === null ? <EmptyValue value={null} reasonCode="NO_LEADTIME" /> : <span className={r.gap > 0 ? 'text-danger' : 'text-good'}>{r.gap > 0 ? '+' : ''}{r.gap}일</span> },
];

export default async function LeadtimePage() {
  const { rows, error } = await getLeadtimeGap();
  return <><PageHeader title="리드타임 격차" description="마스터 표준 리드타임과 실제 실적 P80을 비교해 계획이 현실보다 짧게 잡힌 공급처를 찾습니다." /><>
    {error ? <Panel><p className="text-danger">조회에 실패했습니다.</p><p className="muted">{error}</p></Panel> : <>
      <div className="grid grid-3"><KpiCard label="공급처" value={rows.length} unit="곳" foot="사용 중인 생산법인" /><KpiCard label="실제가 더 김" value={rows.filter((r) => r.gap !== null && r.gap > 0).length} unit="곳" foot="격차가 양수인 공급처" tone="danger" /><KpiCard label="표본 부족" value={rows.filter((r) => r.sampleCount < 10).length} unit="곳" foot="표본 10건 미만" tone="warn" /></div>
      <Panel title="공급처별 리드타임" meta="격차 = P80 − 마스터" className="section"><DataTable columns={columns} rows={rows} rowKey={(r, i) => `${r.supplier}-${i}`} empty="표시할 데이터가 없습니다. analytics.v_leadtime_gap를 확인하세요." /></Panel>
    </>}
  </></>;
}
