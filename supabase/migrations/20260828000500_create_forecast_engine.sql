-- STEP 6: SQL Baseline Forecast Engine
-- Forecast 계산은 core.v_train_demand에서 만든 월별 학습 Grid만 사용합니다.

alter table core.forecast_setting
  add column if not exists forecast_horizon integer;
update core.forecast_setting
set forecast_horizon = 3
where forecast_horizon is null;
alter table core.forecast_setting
  alter column forecast_horizon set default 3;
alter table core.forecast_setting
  alter column forecast_horizon set not null;
alter table core.forecast_setting
  drop constraint if exists forecast_setting_forecast_horizon_check;
alter table core.forecast_setting
  add constraint forecast_setting_forecast_horizon_check check (forecast_horizon > 0 and forecast_horizon <= 36);

create table if not exists core.model_config (
  model_id text primary key,
  model_name text not null,
  family text not null,
  engine text not null,
  version text not null,
  enabled boolean not null default false,
  is_default boolean not null default false,
  applicable_demand_type text[] not null default array[]::text[],
  parameters jsonb not null default '{}'::jsonb,
  description text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  check (model_id = upper(model_id)),
  check (applicable_demand_type <@ array['SMOOTH', 'INTERMITTENT', 'ERRATIC', 'LUMPY']::text[])
);

create table if not exists core.model_version (
  version_id uuid primary key default gen_random_uuid(),
  model_id text not null,
  model_version text not null,
  model_definition jsonb not null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  unique (model_id, model_version, created_at)
);

create table if not exists core.forecast_run (
  run_id uuid primary key default gen_random_uuid(),
  status text not null check (status in ('RUNNING', 'SUCCESS', 'FAILED')),
  granularity text not null,
  train_start date not null,
  train_end date not null,
  horizon integer not null check (horizon > 0),
  champion_metric text,
  data_snapshot_at timestamptz not null,
  models jsonb not null default '[]'::jsonb,
  n_models integer not null default 0,
  n_items integer not null default 0,
  n_rows integer not null default 0,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  duration_ms bigint,
  triggered_by uuid not null references auth.users(id) on delete restrict,
  triggered_email text not null default '',
  note text,
  message text
);

create table if not exists core.forecast_result (
  run_id uuid not null references core.forecast_run(run_id) on delete cascade,
  model_id text not null,
  model_version text not null,
  item_id text not null,
  period date not null,
  predicted_qty numeric,
  p50 numeric,
  p80 numeric,
  p90 numeric,
  sigma numeric,
  basis text not null,
  reason_code text,
  primary key (run_id, model_id, item_id, period)
);

create index if not exists model_version_model_idx on core.model_version(model_id, created_at desc);
create index if not exists forecast_run_started_idx on core.forecast_run(started_at desc);
create index if not exists forecast_result_run_idx on core.forecast_result(run_id, model_id, item_id);

insert into core.model_config (model_id, model_name, family, engine, version, enabled, is_default, applicable_demand_type, parameters, description)
values
  ('MA_3M', '3개월 이동평균', 'MOVING_AVERAGE', 'SQL', '1.0.0', true, true, array['SMOOTH', 'ERRATIC']::text[], '{"window": 3}'::jsonb, '최근 3개월 평균'),
  ('MA_6M', '6개월 이동평균', 'MOVING_AVERAGE', 'SQL', '1.0.0', true, false, array['SMOOTH', 'ERRATIC']::text[], '{"window": 6}'::jsonb, '최근 6개월 평균'),
  ('WMA_3M', '3개월 가중이동평균', 'WEIGHTED_MOVING_AVERAGE', 'SQL', '1.0.0', true, false, array['SMOOTH', 'ERRATIC']::text[], '{"weights": [3, 2, 1]}'::jsonb, '최근순 가중치 3:2:1'),
  ('PY_SAME_MONTH', '전년 동월', 'SEASONAL_NAIVE', 'SQL', '1.0.0', true, false, array['SMOOTH', 'INTERMITTENT', 'ERRATIC', 'LUMPY']::text[], '{"lag_months": 12}'::jsonb, '전년 동월 실적'),
  ('SEASONAL_NAIVE', '계절성 나이브', 'SEASONAL_NAIVE', 'SQL', '1.0.0', true, false, array['SMOOTH', 'INTERMITTENT', 'ERRATIC', 'LUMPY']::text[], '{"lag_months": 12}'::jsonb, '12개월 전 동일 월')
on conflict (model_id) do update set
  model_name = excluded.model_name,
  family = excluded.family,
  engine = excluded.engine,
  updated_at = now();

create or replace view core.v_train_demand_monthly as
with settings as (
  select train_start, train_end
  from core.forecast_setting
  where setting_key = 'default'
), periods as (
  select generated.period_month::date as period
  from settings
  cross join lateral generate_series(
    date_trunc('month', settings.train_start),
    date_trunc('month', settings.train_end),
    interval '1 month'
  ) as generated(period_month)
  where settings.train_start is not null and settings.train_end is not null
), items as (
  select distinct item_id, coalesce(item_name, item_id) as item_name
  from core.v_item_master
), actuals as (
  select item_id, date_trunc('month', use_date)::date as period, sum(qty) as qty
  from core.v_train_demand
  group by item_id, date_trunc('month', use_date)::date
), grid as (
  select i.item_id, i.item_name, p.period,
         case when a.item_id is null then 0::numeric else a.qty end as qty
  from items i cross join periods p
  left join actuals a on a.item_id = i.item_id and a.period = p.period
)
select item_id, item_name, period,
       row_number() over (partition by item_id order by period)::integer as period_index,
       qty
from grid;

create or replace function core.baseline_point(
  p_model_id text,
  p_item_id text,
  p_period date,
  p_parameters jsonb
)
returns numeric
language plpgsql
stable
security definer
set search_path = pg_catalog, core, extensions
as $$
declare
  v_window integer;
  v_weights numeric[];
  v_values numeric[];
  v_count integer;
  v_result numeric;
begin
  if p_model_id in ('PY_SAME_MONTH', 'SEASONAL_NAIVE') then
    return (select qty from core.v_train_demand_monthly where item_id = p_item_id and period = (p_period - make_interval(months => coalesce((p_parameters ->> 'lag_months')::integer, 12)))::date);
  elsif p_model_id in ('MA_3M', 'MA_6M') then
    v_window := coalesce((p_parameters ->> 'window')::integer, case when p_model_id = 'MA_3M' then 3 else 6 end);
    select count(*)::integer, avg(qty) into v_count, v_result
    from (select qty from core.v_train_demand_monthly where item_id = p_item_id and period < p_period order by period desc limit v_window) recent;
    if v_count < v_window then return null; end if;
    return v_result;
  elsif p_model_id = 'WMA_3M' then
    v_weights := array(select jsonb_array_elements_text(coalesce(p_parameters -> 'weights', '[3,2,1]'::jsonb))::numeric);
    select array_agg(qty order by period desc), count(*)::integer into v_values, v_count
    from (select qty, period from core.v_train_demand_monthly where item_id = p_item_id and period < p_period order by period desc limit coalesce(array_length(v_weights, 1), 3)) recent;
    if v_count < coalesce(array_length(v_weights, 1), 3) then return null; end if;
    return (select sum(v_values[i] * v_weights[i]) / nullif(sum(v_weights), 0) from generate_subscripts(v_values, 1) g(i));
  end if;
  return null;
end;
$$;

create or replace function core.run_baseline_forecast(p_note text default null)
returns uuid
language plpgsql
volatile
security definer
set search_path = pg_catalog, core
as $$
declare
  v_run_id uuid := gen_random_uuid();
  v_actor uuid := auth.uid();
  v_email text;
  v_setting core.forecast_setting;
  v_snapshot timestamptz;
  v_models jsonb := '[]'::jsonb;
  v_model record;
  v_item record;
  v_version_id uuid;
  v_sigma numeric;
  v_point numeric;
  v_period date;
  v_model_count integer := 0;
  v_item_count integer := 0;
  v_row_count integer := 0;
  v_started timestamptz := clock_timestamp();
begin
  if v_actor is null or not core.is_admin() then raise exception using errcode = '42501', message = '관리자 권한이 필요합니다.'; end if;
  select * into v_setting from core.forecast_setting where setting_key = 'default';
  if not found or v_setting.train_start is null or v_setting.train_end is null then raise exception using errcode = '22023', message = 'Forecast 학습기간 설정이 필요합니다.'; end if;
  select email into v_email from core.app_user where user_id = v_actor;
  select coalesce(max(loaded_at), v_started) into v_snapshot from core.v_train_demand;
  if v_snapshot < v_started then v_snapshot := v_started; end if;
  insert into core.forecast_run(run_id, status, granularity, train_start, train_end, horizon, data_snapshot_at, triggered_by, triggered_email, note)
  values (v_run_id, 'RUNNING', v_setting.granularity, v_setting.train_start, v_setting.train_end, v_setting.forecast_horizon, v_snapshot, v_actor, coalesce(v_email, ''), p_note);

  for v_model in select * from core.model_config where enabled order by model_id loop
    v_model_count := v_model_count + 1;
    insert into core.model_version(model_id, model_version, model_definition, created_by)
    values (v_model.model_id, v_model.version, to_jsonb(v_model), v_actor)
    returning version_id into v_version_id;
    v_models := v_models || jsonb_build_object('model_id', v_model.model_id, 'version', v_model.version, 'version_id', v_version_id);
    for v_item in select distinct d.item_id
      from core.v_train_demand_monthly d
      join analytics.v_sku_demand_profile p on p.item_id = d.item_id
      where p.demand_type = any(v_model.applicable_demand_type) loop
      v_item_count := v_item_count + 1;
      select stddev_samp(qty - fitted) into v_sigma
      from (
        select d.qty, core.baseline_point(v_model.model_id, d.item_id, d.period, v_model.parameters) as fitted
        from core.v_train_demand_monthly d
        where d.item_id = v_item.item_id
      ) fitted_rows
      where fitted is not null;
      for v_period in select (v_setting.train_end + make_interval(months => n))::date from generate_series(1, v_setting.forecast_horizon) n loop
        v_point := core.baseline_point(v_model.model_id, v_item.item_id, v_period, v_model.parameters);
        insert into core.forecast_result(run_id, model_id, model_version, item_id, period, predicted_qty, p50, p80, p90, sigma, basis, reason_code)
        values (
          v_run_id, v_model.model_id, v_model.version, v_item.item_id, v_period,
          v_point, v_point,
          case when v_point is not null and v_sigma is not null then v_point + 1.2815515655446 * v_sigma else null end,
          case when v_point is not null and v_sigma is not null then v_point + 1.6448536269515 * v_sigma else null end,
          v_sigma, v_model.model_name,
          case when v_point is null then 'INSUFFICIENT_HISTORY' when v_sigma is null then 'SIGMA_UNAVAILABLE' else null end
        ) on conflict do nothing;
        v_row_count := v_row_count + 1;
      end loop;
    end loop;
  end loop;
  update core.forecast_run set status = 'SUCCESS', models = v_models, n_models = v_model_count, n_items = (select count(distinct item_id) from core.forecast_result where run_id = v_run_id), n_rows = v_row_count, finished_at = clock_timestamp(), duration_ms = extract(epoch from (clock_timestamp() - v_started)) * 1000, message = 'Baseline Forecast 완료' where run_id = v_run_id;
  return v_run_id;
exception when others then
  update core.forecast_run set status = 'FAILED', finished_at = clock_timestamp(), duration_ms = extract(epoch from (clock_timestamp() - v_started)) * 1000, message = sqlerrm where run_id = v_run_id;
  raise;
end;
$$;

create or replace view analytics.v_model_config as select model_id, model_name, family, engine, version, enabled, is_default, applicable_demand_type, parameters, description, updated_at, updated_by from core.model_config;
create or replace view analytics.v_forecast_run as
select r.*,
       (exists (select 1 from core.v_train_demand d where d.loaded_at > r.data_snapshot_at)
        or exists (select 1 from core.upload_batch b where b.imported_at > r.data_snapshot_at and b.import_type in ('usage_history', 'sales_order'))) as is_stale
from core.forecast_run r;
create or replace view analytics.v_forecast_result as select * from core.forecast_result;
create or replace view analytics.v_forecast_run_kpi as
select r.run_id, r.status, r.n_models, r.n_items, r.n_rows, count(fr.run_id)::integer as result_rows, r.data_snapshot_at,
       (exists (select 1 from core.v_train_demand d where d.loaded_at > r.data_snapshot_at)
        or exists (select 1 from core.upload_batch b where b.imported_at > r.data_snapshot_at and b.import_type in ('usage_history', 'sales_order'))) as is_stale
from core.forecast_run r
left join core.forecast_result fr on fr.run_id = r.run_id
group by r.run_id, r.status, r.n_models, r.n_items, r.n_rows, r.data_snapshot_at;

alter table core.model_config enable row level security;
alter table core.model_version enable row level security;
alter table core.forecast_run enable row level security;
alter table core.forecast_result enable row level security;

drop policy if exists model_config_authenticated_select on core.model_config;
create policy model_config_authenticated_select on core.model_config for select to authenticated using (true);
drop policy if exists model_config_admin_mutation on core.model_config;
create policy model_config_admin_mutation on core.model_config for all to authenticated using ((select core.is_admin())) with check ((select core.is_admin()));
drop policy if exists model_version_authenticated_select on core.model_version;
create policy model_version_authenticated_select on core.model_version for select to authenticated using (true);
drop policy if exists forecast_run_authenticated_select on core.forecast_run;
create policy forecast_run_authenticated_select on core.forecast_run for select to authenticated using (true);
drop policy if exists forecast_result_authenticated_select on core.forecast_result;
create policy forecast_result_authenticated_select on core.forecast_result for select to authenticated using (true);

revoke all on schema core from anon;
revoke all on core.model_version, core.forecast_run, core.forecast_result from authenticated;
grant usage on schema core to authenticated;
grant select on core.model_config, core.model_version, core.forecast_run, core.forecast_result to authenticated;
grant insert, update, delete on core.model_config to authenticated;
grant execute on function core.run_baseline_forecast(text) to authenticated;
revoke all on function core.run_baseline_forecast(text) from public, anon;
revoke all on function core.baseline_point(text, text, date, jsonb) from public, anon, authenticated;
grant usage on schema analytics to authenticated;
grant select on analytics.v_model_config, analytics.v_forecast_run, analytics.v_forecast_result, analytics.v_forecast_run_kpi to authenticated;
revoke all on analytics.v_model_config, analytics.v_forecast_run, analytics.v_forecast_result, analytics.v_forecast_run_kpi from anon;
