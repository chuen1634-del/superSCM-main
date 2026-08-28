'use client';

import { useMemo, useState } from 'react';
import Badge from '@/components/ui/badge';
import DataTable, { type UiColumn } from '@/components/ui/data-table';
import EmptyValue from '@/components/ui/empty-value';
import { filterDemandProfiles, type DemandProfile, type DemandType } from '@/lib/demand-profile-model';

const demandTypes: Array<DemandType | 'ALL'> = ['ALL', 'SMOOTH', 'INTERMITTENT', 'ERRATIC', 'LUMPY'];
const typeStatus: Record<DemandType, 'SAFE' | 'WARNING' | 'CRITICAL'> = {
  SMOOTH: 'SAFE', INTERMITTENT: 'WARNING', ERRATIC: 'WARNING', LUMPY: 'CRITICAL',
};
const typeLabel: Record<DemandType, string> = {
  SMOOTH: 'SMOOTH', INTERMITTENT: 'INTERMITTENT', ERRATIC: 'ERRATIC', LUMPY: 'LUMPY',
};

function NumberCell({ value, digits = 2, suffix = '', reasonCode }: { value: number | null; digits?: number; suffix?: string; reasonCode?: string | null }) {
  return value === null ? <EmptyValue value={null} reasonCode={reasonCode} /> : <span>{value.toFixed(digits)}{suffix}</span>;
}

const columns: UiColumn<DemandProfile>[] = [
  { key: 'itemId', label: 'SKU' },
  { key: 'itemName', label: '품목명' },
  { key: 'adi', label: 'ADI', align: 'right', render: (row) => <NumberCell value={row.adi} reasonCode={row.reasonCode} /> },
  { key: 'cvSquared', label: 'CV²', align: 'right', render: (row) => <NumberCell value={row.cvSquared} reasonCode={row.reasonCode} /> },
  { key: 'zeroDemandRate', label: 'Zero-demand Rate', align: 'right', render: (row) => <NumberCell value={row.zeroDemandRate} suffix="%" reasonCode={row.reasonCode} /> },
  { key: 'trend', label: 'Trend', align: 'right', render: (row) => <NumberCell value={row.trend} reasonCode={row.reasonCode} /> },
  { key: 'demandType', label: 'Demand Type', align: 'center', render: (row) => row.demandType ? <Badge status={typeStatus[row.demandType]}>{typeLabel[row.demandType]}</Badge> : <Badge status="CALCULATION_UNAVAILABLE">계산 불가</Badge> },
  { key: 'seasonality', label: 'Seasonality', render: (row) => row.seasonality ?? <EmptyValue value={null} reasonCode={row.reasonCode} /> },
  { key: 'reasonCode', label: 'Reason', render: (row) => row.reasonCode ? <span className="text-danger">{row.reasonCode}</span> : <span className="muted">—</span> },
];

export default function DemandProfileTable({ rows }: { rows: DemandProfile[] }) {
  const [demandType, setDemandType] = useState<DemandType | 'ALL'>('ALL');
  const [availability, setAvailability] = useState<'ALL' | 'AVAILABLE' | 'UNAVAILABLE'>('ALL');
  const [search, setSearch] = useState('');
  const filteredRows = useMemo(() => filterDemandProfiles(rows, { demandType, availability, search }), [rows, demandType, availability, search]);

  return <>
    <div className="demand-toolbar">
      <label>Demand Type<select className="form-input" value={demandType} onChange={(event) => setDemandType(event.target.value as DemandType | 'ALL')}>
        {demandTypes.map((type) => <option key={type} value={type}>{type === 'ALL' ? '전체' : type}</option>)}
      </select></label>
      <label>계산 상태<select className="form-input" value={availability} onChange={(event) => setAvailability(event.target.value as typeof availability)}>
        <option value="ALL">전체</option><option value="AVAILABLE">계산 가능</option><option value="UNAVAILABLE">계산 불가</option>
      </select></label>
      <label>SKU 검색<input className="form-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="SKU 또는 품목명" /></label>
    </div>
    <p className="muted">{filteredRows.length.toLocaleString()}개 SKU 표시</p>
    <DataTable columns={columns} rows={filteredRows} rowKey={(row) => row.itemId} empty="조건에 맞는 Demand Profile이 없습니다." />
  </>;
}
