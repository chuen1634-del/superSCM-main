create extension if not exists pgcrypto;

-- 신규 raw 입력 테이블은 자연키를 보존하고 적재 메타데이터를 함께 저장합니다.
create table if not exists raw.business_event (
  event_id text primary key,
  event_type text not null,
  event_date date,
  item_id text,
  supplier_id text,
  event_name text,
  impact_factor numeric,
  note text
);

create table if not exists raw.sales_order (
  sales_order_id text primary key,
  order_date date,
  customer_id text,
  item_id text,
  quantity numeric,
  need_date date,
  status text
);

create table if not exists raw.item_substitute (
  item_id text not null,
  substitute_item_id text not null,
  priority integer,
  valid_from date,
  valid_to date,
  note text,
  primary key (item_id, substitute_item_id)
);

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'shipment_log', 'supplier_master', 'item_master', 'inventory',
    'usage_history', 'forecast', 'goods_receipt', 'purchase_order',
    'business_event', 'sales_order', 'item_substitute'
  ] loop
    execute format('alter table raw.%I add column if not exists batch_id uuid', table_name);
    execute format('alter table raw.%I add column if not exists source_type text', table_name);
    execute format('alter table raw.%I add column if not exists loaded_at timestamptz', table_name);
    execute format('alter table raw.%I add column if not exists source_record_id text', table_name);
    execute format('create index if not exists %I on raw.%I(batch_id)', table_name || '_batch_id_idx', table_name);
  end loop;
end;
$$;

create table if not exists core.policy_config (
  policy_key text primary key,
  service_level numeric(5,4),
  review_period_days integer,
  safety_buffer_days integer,
  config_value jsonb,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (service_level is null or service_level between 0 and 1),
  check (review_period_days is null or review_period_days >= 0),
  check (safety_buffer_days is null or safety_buffer_days >= 0)
);

create table if not exists core.outlier_rule (
  rule_key text primary key,
  outlier_type text not null check (outlier_type in ('PROJECT', 'RETURN', 'DUPLICATE')),
  criteria jsonb not null default '{}'::jsonb,
  exclude_from_training boolean not null default true,
  enabled boolean not null default true,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists core.item_policy (
  item_id text primary key,
  moq numeric,
  pack_size numeric,
  item_grade text,
  service_level numeric(5,4),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (moq is null or moq >= 0),
  check (pack_size is null or pack_size > 0),
  check (service_level is null or service_level between 0 and 1)
);

create table if not exists core.forecast_setting (
  setting_key text primary key default 'default',
  train_start date,
  train_end date,
  test_start date,
  test_end date,
  granularity text not null default 'DAILY' check (granularity in ('DAILY', 'WEEKLY', 'MONTHLY')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (train_start is null or train_end is null or train_start <= train_end),
  check (test_start is null or test_end is null or test_start <= test_end),
  check (train_end is null or test_start is null or train_end < test_start)
);

create or replace view core.v_train_demand as
select
  u.usage_id,
  upper(regexp_replace(u.item_id, '[\s\-_]'::text, ''::text, 'g'::text)) as item_id,
  u.use_date,
  u.qty,
  u.warehouse,
  u.note,
  u.batch_id,
  u.source_type,
  u.loaded_at,
  u.source_record_id,
  s.granularity
from raw.usage_history u
join core.forecast_setting s on s.setting_key = 'default'
where s.train_start is not null
  and s.train_end is not null
  and u.use_date between s.train_start and s.train_end
  and not (
    u.qty < 0 and exists (
      select 1 from core.outlier_rule r
      where r.enabled and r.exclude_from_training and r.outlier_type = 'RETURN'
    )
  )
  and not exists (
    select 1 from core.outlier_rule r
    where r.enabled and r.exclude_from_training and r.outlier_type = 'PROJECT'
      and coalesce(u.note, '') ilike '%' || coalesce(r.criteria ->> 'note_contains', '프로젝트') || '%'
  );

create or replace view core.v_test_actual as
select
  u.usage_id,
  upper(regexp_replace(u.item_id, '[\s\-_]'::text, ''::text, 'g'::text)) as item_id,
  u.use_date,
  u.qty,
  u.warehouse,
  u.note,
  u.batch_id,
  u.source_type,
  u.loaded_at,
  u.source_record_id,
  s.granularity
from raw.usage_history u
join core.forecast_setting s on s.setting_key = 'default'
where s.test_start is not null
  and s.test_end is not null
  and u.use_date between s.test_start and s.test_end;

create or replace view analytics.v_data_coverage as
select
  min(u.use_date) as data_start,
  max(u.use_date) as data_end,
  s.train_start,
  s.train_end,
  s.test_start,
  s.test_end,
  s.granularity,
  (select count(*) from core.v_train_demand) as train_row_count,
  (select count(*) from core.v_test_actual) as test_row_count,
  coalesce((s.train_start is not null and s.train_end is not null and min(u.use_date) <= s.train_start and s.train_start <= s.train_end and s.train_end <= max(u.use_date)), false) as train_window_ok,
  coalesce((s.test_start is not null and s.test_end is not null and min(u.use_date) <= s.test_start and s.test_start <= s.test_end and s.test_end <= max(u.use_date)), false) as test_window_ok
from raw.usage_history u
left join core.forecast_setting s on s.setting_key = 'default'
group by s.train_start, s.train_end, s.test_start, s.test_end, s.granularity;

create or replace view analytics.v_forecast_setting_review as
select
  c.*,
  (select count(*) from core.policy_config p where p.active) as active_policy_count,
  (select count(*) from core.outlier_rule r where r.enabled) as enabled_outlier_rule_count,
  (select count(*) from core.item_policy i) as item_policy_count,
  (select jsonb_agg(to_jsonb(p) order by p.policy_key) from core.policy_config p where p.active) as policy_summary
from analytics.v_data_coverage c;

alter table core.policy_config enable row level security;
alter table core.outlier_rule enable row level security;
alter table core.item_policy enable row level security;
alter table core.forecast_setting enable row level security;

drop policy if exists policy_config_authenticated_select on core.policy_config;
create policy policy_config_authenticated_select on core.policy_config for select to authenticated using (true);
drop policy if exists policy_config_admin_mutation on core.policy_config;
create policy policy_config_admin_mutation on core.policy_config for all to authenticated using ((select core.is_admin())) with check ((select core.is_admin()));
drop policy if exists outlier_rule_authenticated_select on core.outlier_rule;
create policy outlier_rule_authenticated_select on core.outlier_rule for select to authenticated using (true);
drop policy if exists outlier_rule_admin_mutation on core.outlier_rule;
create policy outlier_rule_admin_mutation on core.outlier_rule for all to authenticated using ((select core.is_admin())) with check ((select core.is_admin()));
drop policy if exists item_policy_authenticated_select on core.item_policy;
create policy item_policy_authenticated_select on core.item_policy for select to authenticated using (true);
drop policy if exists item_policy_admin_mutation on core.item_policy;
create policy item_policy_admin_mutation on core.item_policy for all to authenticated using ((select core.is_admin())) with check ((select core.is_admin()));
drop policy if exists forecast_setting_authenticated_select on core.forecast_setting;
create policy forecast_setting_authenticated_select on core.forecast_setting for select to authenticated using (true);
drop policy if exists forecast_setting_admin_mutation on core.forecast_setting;
create policy forecast_setting_admin_mutation on core.forecast_setting for all to authenticated using ((select core.is_admin())) with check ((select core.is_admin()));

revoke all on schema raw from anon, authenticated;
revoke all on all tables in schema raw from anon, authenticated;
grant select on core.policy_config, core.outlier_rule, core.item_policy, core.forecast_setting to authenticated;
grant insert, update, delete on core.policy_config, core.outlier_rule, core.item_policy, core.forecast_setting to authenticated;
revoke all on schema analytics from anon;
revoke all on all tables in schema analytics from anon;
grant usage on schema analytics to authenticated;
grant select on analytics.v_data_coverage, analytics.v_forecast_setting_review to authenticated;
