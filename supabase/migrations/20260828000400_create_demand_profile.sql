-- STEP 5: 학습 구간 월별 수요 프로파일
-- 이 migration의 계산 원천은 core.v_train_demand 하나로 제한합니다.
-- peak_period 동률은 가장 이른 월을 선택합니다.
-- seasonality는 24개월 이상에서 양수 월평균의 최대/최소 비율이 1.20 이상일 때만 표시합니다.

create or replace view analytics.v_sku_demand_profile as
with settings as (
  select train_start, train_end
  from core.forecast_setting
  where setting_key = 'default'
), periods as (
  select row_number() over (order by period_month)::integer as period_index,
         period_month::date as period_month
  from settings
  cross join lateral generate_series(
    date_trunc('month', settings.train_start),
    date_trunc('month', settings.train_end),
    interval '1 month'
  ) as generated(period_month)
  where settings.train_start is not null
    and settings.train_end is not null
), items as (
  select distinct item_id, coalesce(item_name, item_id) as item_name
  from core.v_item_master
), monthly_usage as (
  select item_id,
         date_trunc('month', use_date)::date as period_month,
         sum(qty) as period_qty
  from core.v_train_demand
  group by item_id, date_trunc('month', use_date)::date
), grid as (
  select i.item_id,
         i.item_name,
         p.period_index,
         p.period_month,
         case when m.item_id is null then 0::numeric else m.period_qty end as period_qty,
         (m.item_id is not null) as has_observation
  from items i
  cross join periods p
  left join monthly_usage m
    on m.item_id = i.item_id
   and m.period_month = p.period_month
), summary as (
  select item_id,
         max(item_name) as item_name,
         count(*)::integer as n_periods,
         count(*) filter (where period_qty > 0)::integer as n_nonzero_periods,
         sum(period_qty) as total_qty,
         avg(period_qty) filter (where period_qty > 0) as nonzero_mean,
         stddev_samp(period_qty) filter (where period_qty > 0) as nonzero_sd,
         avg(period_qty) as period_mean,
         regr_slope(period_qty, period_index) as trend_per_period,
         min(period_month) filter (where period_qty = max_period_qty) as peak_period
  from (
    select g.*,
           max(period_qty) over (partition by item_id) as max_period_qty
    from grid g
  ) measured
  group by item_id
), recent as (
  select item_id,
         avg(period_qty) filter (where period_index > n_periods - 3) as recent_mean,
         avg(period_qty) filter (where period_index between n_periods - 5 and n_periods - 3) as prior_mean
  from grid
  join summary using (item_id)
  group by item_id
), month_means as (
  select item_id,
         extract(month from period_month)::integer as month_number,
         avg(period_qty) as month_mean
  from grid
  group by item_id, extract(month from period_month)::integer
), seasonality_stats as (
  select item_id,
         count(*)::integer as observed_month_numbers,
         min(month_mean) filter (where month_mean > 0) as min_month_mean,
         max(month_mean) as max_month_mean
  from month_means
  group by item_id
), calculated as (
  select s.*,
         case when s.n_nonzero_periods > 0 then s.n_periods::numeric / s.n_nonzero_periods else null end as adi,
         case when s.nonzero_mean > 0 and s.n_nonzero_periods >= 2 then s.nonzero_sd / s.nonzero_mean else null end as cv,
         case when r.prior_mean > 0 and s.n_periods >= 6 then (r.recent_mean - r.prior_mean) / r.prior_mean else null end as recent_change_rate,
         r.prior_mean,
         ss.observed_month_numbers,
         ss.min_month_mean,
         ss.max_month_mean
  from summary s
  left join recent r using (item_id)
  left join seasonality_stats ss using (item_id)
)
select item_id,
       item_name,
       n_periods,
       n_nonzero_periods,
       round(adi, 4) as adi,
       round(cv, 4) as cv,
       round(cv * cv, 4) as cv_squared,
       round(case when n_periods > 0 then 100 * (n_periods - n_nonzero_periods)::numeric / n_periods else null end, 2) as zero_demand_rate,
       round(trend_per_period, 4) as trend,
       round(recent_change_rate, 4) as recent_change_rate,
       peak_period,
       case
         when adi is null or cv is null then null
         when adi < 1.32 and cv * cv < 0.49 then 'SMOOTH'
         when adi >= 1.32 and cv * cv < 0.49 then 'INTERMITTENT'
         when adi < 1.32 and cv * cv >= 0.49 then 'ERRATIC'
         when adi >= 1.32 and cv * cv >= 0.49 then 'LUMPY'
       end as demand_type,
       case
         when n_periods < 24 then null
         when observed_month_numbers < 12 then null
         when min_month_mean > 0 and max_month_mean / min_month_mean >= 1.20 then 'SEASONAL'
         else 'NOT_SEASONAL'
       end as seasonality,
       case
         when n_nonzero_periods = 0 then 'NO_DEMAND'
         when nonzero_mean <= 0 or n_nonzero_periods < 2 then 'INSUFFICIENT_NONZERO_PERIODS'
         when n_periods < 24 then 'INSUFFICIENT_PERIODS'
         when trend_per_period is null then 'INSUFFICIENT_TREND_PERIODS'
         when prior_mean is null or prior_mean <= 0 then 'NO_RECENT_BASELINE'
         else null
       end as reason_code,
       case
         when cv * cv < 0.49 then 'STABLE'
         when cv * cv >= 0.49 then 'VARIABLE'
         else null
       end as stability
from calculated;

create or replace view analytics.v_demand_profile_kpi as
select count(*)::integer as total_items,
       count(*) filter (where demand_type = 'SMOOTH')::integer as n_smooth,
       count(*) filter (where demand_type = 'INTERMITTENT')::integer as n_intermittent,
       count(*) filter (where demand_type = 'ERRATIC')::integer as n_erratic,
       count(*) filter (where demand_type = 'LUMPY')::integer as n_lumpy,
       count(*) filter (where demand_type in ('INTERMITTENT', 'LUMPY'))::integer as n_croston_needed,
       count(*) filter (where demand_type is null or reason_code is not null)::integer as n_calculation_unavailable
from analytics.v_sku_demand_profile;

revoke all on analytics.v_sku_demand_profile from anon;
revoke all on analytics.v_demand_profile_kpi from anon;
grant usage on schema analytics to authenticated;
grant select on analytics.v_sku_demand_profile, analytics.v_demand_profile_kpi to authenticated;
