import PageHeader from '@/components/shell/page-header';
import Badge from '@/components/ui/badge';
import EmptyValue from '@/components/ui/empty-value';
import Panel from '@/components/ui/panel';
import { requireAdmin } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { coverageStatus } from '@/lib/forecast-model';

export const dynamic = 'force-dynamic';

type ReviewRow = { data_start: string | null; data_end: string | null; train_start: string | null; train_end: string | null; test_start: string | null; test_end: string | null; granularity: string | null; train_row_count: number | null; test_row_count: number | null; train_window_ok: boolean | null; test_window_ok: boolean | null; active_policy_count: number | null; enabled_outlier_rule_count: number | null; item_policy_count: number | null };

function DateValue({ value, reasonCode }: { value: string | null; reasonCode: string }) { return value ? <span>{value}</span> : <EmptyValue value={value} reasonCode={reasonCode} />; }

export default async function ForecastSettingsPage() {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.schema('analytics').from('v_forecast_setting_review').select('*').maybeSingle();
  const row = data as ReviewRow | null;
  return <><PageHeader eyebrow="ADMIN" title="Forecast 설정" description="학습·검증 기간과 정책값, 데이터 격리 상태를 확인합니다." />
    {error ? <Panel><p className="text-danger">Forecast 설정 조회에 실패했습니다.</p><p className="muted">{error.message}</p></Panel> : !row ? <Panel><p className="muted">Forecast 설정이 아직 없습니다.</p><p className="muted">core.forecast_setting에 기간을 등록하세요.</p></Panel> : <>
      <Panel title="데이터 기간" meta={row.granularity ?? '미설정'}><div className="grid grid-3"><div><div className="metric-label">전체 데이터</div><p><DateValue value={row.data_start} reasonCode="NO_DATA" /> ~ <DateValue value={row.data_end} reasonCode="NO_DATA" /></p></div><div><div className="metric-label">학습 기간</div><p><DateValue value={row.train_start} reasonCode="NO_TRAIN_START" /> ~ <DateValue value={row.train_end} reasonCode="NO_TRAIN_END" /></p></div><div><div className="metric-label">검증 기간</div><p><DateValue value={row.test_start} reasonCode="NO_TEST_START" /> ~ <DateValue value={row.test_end} reasonCode="NO_TEST_END" /></p></div></div></Panel>
      <div className="grid grid-3 section"><Panel title="데이터 격리 상태"><Badge status={coverageStatus({ trainWindowOk: row.train_window_ok, testWindowOk: row.test_window_ok }) === 'READY' ? 'SAFE' : coverageStatus({ trainWindowOk: row.train_window_ok, testWindowOk: row.test_window_ok }) === 'INVALID' ? 'CRITICAL' : 'CALCULATION_UNAVAILABLE'}>{coverageStatus({ trainWindowOk: row.train_window_ok, testWindowOk: row.test_window_ok })}</Badge><p className="muted">학습 {row.train_row_count ?? '—'}행 · 검증 {row.test_row_count ?? '—'}행</p></Panel><Panel title="정책 설정"><p>공통 정책 <strong>{row.active_policy_count ?? '—'}</strong>개</p><p>이상치 규칙 <strong>{row.enabled_outlier_rule_count ?? '—'}</strong>개</p></Panel><Panel title="품목 정책"><p>MOQ·Pack Size·등급·서비스 레벨</p><p><strong>{row.item_policy_count ?? '—'}</strong>개 품목</p></Panel></div>
    </>}
  </>;
}
