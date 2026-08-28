import PageHeader from '@/components/shell/page-header';
import Badge from '@/components/ui/badge';
import DataTable, { type UiColumn } from '@/components/ui/data-table';
import EmptyValue from '@/components/ui/empty-value';
import KpiCard from '@/components/ui/kpi-card';
import Panel from '@/components/ui/panel';
import { getStockoutKpi, getStockoutRisk } from '@/lib/scm';
import type { StockoutRisk, StockoutRiskStatus } from '@/lib/scm-model';

export const dynamic = 'force-dynamic';

const statusLabel: Record<StockoutRiskStatus, string> = { SAFE: '안전', CRITICAL: '위험', UNKNOWN: '계산 불가' };
const statusMap: Record<StockoutRiskStatus, 'SAFE' | 'CRITICAL' | 'CALCULATION_UNAVAILABLE'> = { SAFE: 'SAFE', CRITICAL: 'CRITICAL', UNKNOWN: 'CALCULATION_UNAVAILABLE' };
function NumberCell({ value, unit, reason }: { value: number | null; unit: string; reason?: string | null }) { return value === null ? <EmptyValue value={value} reasonCode={reason} /> : <span>{Number.isInteger(value) ? value : value.toFixed(1)}{unit}</span>; }
function StatusCell({ row }: { row: StockoutRisk }) { return <Badge status={statusMap[row.riskStatus]}>{statusLabel[row.riskStatus]}</Badge>; }

const columns: UiColumn<StockoutRisk>[] = [
  { key: 'itemId', label: '품목코드' }, { key: 'itemName', label: '품목명' }, { key: 'supplierId', label: '공급처' },
  { key: 'availableQty', label: '가용수량', align: 'right', render: (r) => <NumberCell value={r.availableQty} unit=" EA" reason="NO_STOCK" /> },
  { key: 'dailyUsageAvg', label: '일평균 사용량', align: 'right', render: (r) => <NumberCell value={r.dailyUsageAvg} unit=" EA" reason={r.reason} /> },
  { key: 'plannedLeadTime', label: '계획 LT', align: 'right', render: (r) => <NumberCell value={r.plannedLeadTime} unit="일" reason="NO_LEADTIME" /> },
  { key: 'stockoutDays', label: '소진까지', align: 'right', render: (r) => <NumberCell value={r.stockoutDays} unit="일" reason={r.reason} /> },
  { key: 'stockoutDate', label: '소진예정일', render: (r) => r.stockoutDate ? r.stockoutDate : <EmptyValue value={null} reasonCode={r.reason} /> },
  { key: 'riskStatus', label: '상태', align: 'center', render: (r) => <StatusCell row={r} /> },
];

export default async function StockoutRiskPage() {
  const [{ rows, error: riskError }, { data: kpi, error: kpiError }] = await Promise.all([getStockoutRisk(), getStockoutKpi()]);
  return <><PageHeader title="재고 소진 위험" description="가용재고와 일평균 사용량을 기준으로 계획 리드타임 안에 재고가 소진될 품목을 확인합니다." />
    {riskError || kpiError ? <Panel><p className="text-danger">조회에 실패했습니다.</p>{riskError ? <p className="muted">소진위험 목록: {riskError}</p> : null}{kpiError ? <p className="muted">소진위험 KPI: {kpiError}</p> : null}</Panel> : rows.length === 0 ? <Panel><p className="muted">표시할 데이터가 없습니다.</p><p className="muted">analytics.v_stockout_risk를 확인하세요.</p></Panel> : <>
      <div className="grid grid-4"><KpiCard label="전체 품목" value={kpi?.nItems ?? <EmptyValue value={null} reasonCode="NO_KPI" />} unit={kpi?.nItems === null ? undefined : '개'} foot="활성 품목 기준" /><KpiCard label="소진 위험" value={kpi?.nCritical ?? <EmptyValue value={null} reasonCode="NO_KPI" />} unit={kpi?.nCritical === null ? undefined : '개'} foot="계획 리드타임 이내 소진" tone="danger" /><KpiCard label="30일 이내 소진" value={kpi?.nWithin30d ?? <EmptyValue value={null} reasonCode="NO_KPI" />} unit={kpi?.nWithin30d === null ? undefined : '개'} foot="소진예정일 기준" tone="warn" /><KpiCard label="계산 불가" value={kpi?.nUnknown ?? <EmptyValue value={null} reasonCode="NO_KPI" />} unit={kpi?.nUnknown === null ? undefined : '개'} foot="사용량 또는 리드타임 없음" /></div>
      <Panel title="품목별 소진위험" meta="가용수량 ÷ 일평균 사용량" className="section"><DataTable columns={columns} rows={rows} rowKey={(r) => r.itemId} empty="표시할 데이터가 없습니다. analytics.v_stockout_risk를 확인하세요." /></Panel>
    </>}
  </>;
}
