import Link from 'next/link';
import PageHeader from '@/components/shell/page-header';
import KpiCard from '@/components/ui/kpi-card';
import Panel from '@/components/ui/panel';
import InsightBanner from '@/components/ui/insight-banner';

export default function UserHomePage() {
  return <>
    <PageHeader title="전체 현황" description="월간 발주계획과 공급 리스크를 한 화면에서 확인합니다." actions={<Link href="/analysis/stockout" className="button primary">소진위험 확인</Link>} />
    <div className="grid grid-3"><KpiCard label="분석 화면" value="2" unit="개" foot="Lead Time · Stockout" /><KpiCard label="데이터 기준" value="2026.09" foot="현재 발주계획 기준월" /><KpiCard label="시스템 상태" value="정상" foot="Supabase 연결 확인" tone="good" /></div>
    <div className="grid grid-2 section"><Panel title="주요 분석" meta="Analytics"><div className="button-row"><Link href="/analysis/leadtime" className="button">리드타임 분석</Link><Link href="/analysis/stockout" className="button">소진위험 분석</Link></div></Panel><InsightBanner title="다음 확인 항목">계산 불가 품목과 위험 상태를 먼저 확인한 뒤 발주계획을 검토하세요.</InsightBanner></div>
  </>;
}
