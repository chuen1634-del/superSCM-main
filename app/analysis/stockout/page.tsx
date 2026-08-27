import AnalysisFrame from '@/components/analysis/analysis-frame';
import DataTable, { formatNumber, type Column } from '@/components/analysis/data-table';
import { getStockoutKpi, getStockoutRisk } from '@/lib/scm';
import type { StockoutRisk, StockoutRiskStatus } from '@/lib/scm-model';

export const dynamic = 'force-dynamic';

const statusLabel: Record<StockoutRiskStatus, string> = {
  SAFE: '안전',
  CRITICAL: '위험',
  UNKNOWN: '계산 불가',
};

const statusTone: Record<StockoutRiskStatus, string> = {
  SAFE: 'green',
  CRITICAL: 'red',
  UNKNOWN: 'gray',
};

function StatusCell({ row }: { row: StockoutRisk }) {
  return <span className={`tag ${statusTone[row.riskStatus]}`}>{statusLabel[row.riskStatus]}</span>;
}

function DateCell({ value }: { value: string | null }) {
  if (!value) return <span className="muted">—</span>;
  return <span>{value}</span>;
}

const columns: Column<StockoutRisk>[] = [
  { key: 'itemId', label: '품목코드' },
  { key: 'itemName', label: '품목명' },
  { key: 'supplierId', label: '공급처' },
  {
    key: 'availableQty',
    label: '가용수량',
    align: 'right',
    render: (row) => formatNumber(row.availableQty, ' EA'),
  },
  {
    key: 'dailyUsageAvg',
    label: '일평균 사용량',
    align: 'right',
    render: (row) => formatNumber(row.dailyUsageAvg, ' EA'),
  },
  {
    key: 'plannedLeadTime',
    label: '계획 LT',
    align: 'right',
    render: (row) => formatNumber(row.plannedLeadTime, '일'),
  },
  {
    key: 'stockoutDays',
    label: '소진까지',
    align: 'right',
    render: (row) => formatNumber(row.stockoutDays, '일'),
  },
  {
    key: 'stockoutDate',
    label: '소진예정일',
    render: (row) => <DateCell value={row.stockoutDate} />,
  },
  {
    key: 'riskStatus',
    label: '상태',
    align: 'center',
    render: (row) => <StatusCell row={row} />,
  },
];

export default async function StockoutRiskPage() {
  const [{ rows, error: riskError }, { data: kpi, error: kpiError }] = await Promise.all([
    getStockoutRisk(),
    getStockoutKpi(),
  ]);

  return (
    <AnalysisFrame
      title="재고 소진 위험"
      description="가용재고와 일평균 사용량을 기준으로 계획 리드타임 안에 재고가 소진될 품목을 확인합니다."
    >
      {riskError || kpiError ? (
        <div className="card">
          <p className="text-danger">조회에 실패했습니다.</p>
          {riskError && <p className="muted">소진위험 목록: {riskError}</p>}
          {kpiError && <p className="muted">소진위험 KPI: {kpiError}</p>}
        </div>
      ) : rows.length === 0 ? (
        <div className="card">
          <p className="muted">표시할 데이터가 없습니다.</p>
          <p className="muted">Exposed schemas 와 analytics.v_stockout_risk 를 확인하세요.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-4">
            <div className="card metric">
              <div className="metric-label">전체 품목</div>
              <div className="metric-value">{kpi?.nItems ?? '—'}</div>
              <div className="metric-foot">활성 품목 기준</div>
            </div>
            <div className="card metric">
              <div className="metric-label">소진 위험</div>
              <div className="metric-value">{kpi?.nCritical ?? '—'}</div>
              <div className="metric-foot warn">계획 리드타임 이내 소진</div>
            </div>
            <div className="card metric">
              <div className="metric-label">30일 이내 소진</div>
              <div className="metric-value">{kpi?.nWithin30d ?? '—'}</div>
              <div className="metric-foot">소진예정일 기준</div>
            </div>
            <div className="card metric">
              <div className="metric-label">계산 불가</div>
              <div className="metric-value">{kpi?.nUnknown ?? '—'}</div>
              <div className="metric-foot">사용량 또는 리드타임 없음</div>
            </div>
          </div>

          <div className="section card">
            <div className="card-title">
              <h3>품목별 소진위험</h3>
              <span>가용수량 ÷ 일평균 사용량</span>
            </div>
            <DataTable
              columns={columns}
              rows={rows}
              rowKey={(row) => row.itemId}
              empty="표시할 데이터가 없습니다. analytics.v_stockout_risk 를 확인하세요."
            />
          </div>
        </>
      )}
    </AnalysisFrame>
  );
}
