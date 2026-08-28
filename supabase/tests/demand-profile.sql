-- STEP 5 수동 검증 SQL

select to_regclass('analytics.v_sku_demand_profile') as profile_view,
       to_regclass('analytics.v_demand_profile_kpi') as kpi_view;

select has_table_privilege('anon', 'analytics.v_sku_demand_profile', 'select') as anon_profile_select,
       has_table_privilege('authenticated', 'analytics.v_sku_demand_profile', 'select') as authenticated_profile_select;

select demand_type, count(*)
from analytics.v_sku_demand_profile
group by demand_type
order by demand_type;

select count(*) as profiles_with_invalid_demand_type
from analytics.v_sku_demand_profile
where demand_type is not null
  and demand_type not in ('SMOOTH', 'INTERMITTENT', 'ERRATIC', 'LUMPY');

select count(*) as profiles_without_type_or_reason
from analytics.v_sku_demand_profile
where demand_type is null and reason_code is null;

select * from analytics.v_demand_profile_kpi;

-- view 정의가 검증기간/raw 원본을 직접 참조하지 않는지 확인합니다.
select position('raw.usage_history' in pg_get_viewdef('analytics.v_sku_demand_profile'::regclass)) = 0 as no_raw_usage_reference,
       position('v_test_actual' in pg_get_viewdef('analytics.v_sku_demand_profile'::regclass)) = 0 as no_test_reference,
       position('v_train_demand' in pg_get_viewdef('analytics.v_sku_demand_profile'::regclass)) > 0 as train_view_reference;
