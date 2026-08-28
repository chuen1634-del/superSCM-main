-- STEP 6 수동 검증 SQL

select to_regclass('core.model_config') as model_config,
       to_regclass('core.model_version') as model_version,
       to_regclass('core.forecast_run') as forecast_run,
       to_regclass('core.forecast_result') as forecast_result;

select model_id, version, enabled, applicable_demand_type, parameters
from analytics.v_model_config
order by model_id;

select count(*) as registered_baseline_models,
       count(*) filter (where model_id in ('MA_3M', 'MA_6M', 'WMA_3M', 'PY_SAME_MONTH', 'SEASONAL_NAIVE')) as expected_model_count
from analytics.v_model_config;

select has_table_privilege('anon', 'analytics.v_forecast_run', 'select') as anon_run_select,
       has_table_privilege('authenticated', 'analytics.v_forecast_run', 'select') as authenticated_run_select,
       has_function_privilege('authenticated', 'core.run_baseline_forecast(text)', 'execute') as authenticated_run_execute;

select count(*) as invalid_result_model_types
from analytics.v_forecast_result
where model_id not in ('MA_3M', 'MA_6M', 'WMA_3M', 'PY_SAME_MONTH', 'SEASONAL_NAIVE');

select run_id, status, n_models, n_items, n_rows, data_snapshot_at, is_stale
from analytics.v_forecast_run
order by started_at desc
limit 10;

select run_id, model_id, model_version, item_id, period, predicted_qty, p50, p80, p90, sigma, basis, reason_code
from analytics.v_forecast_result
order by period, item_id, model_id
limit 50;

select count(*) as result_without_model_version
from analytics.v_forecast_result
where model_version is null or model_version = '';

select count(*) as unavailable_interval_with_filled_value
from analytics.v_forecast_result
where sigma is null and (p80 is not null or p90 is not null);

-- Forecast SQL이 raw usage/test actual을 직접 참조하지 않는지 확인합니다.
select position('raw.usage_history' in pg_get_viewdef('core.v_train_demand_monthly'::regclass)) = 0 as monthly_grid_has_no_raw_reference,
       position('v_test_actual' in pg_get_functiondef('core.run_baseline_forecast(text)'::regprocedure)) = 0 as forecast_has_no_test_reference,
       position('v_train_demand' in pg_get_viewdef('core.v_train_demand_monthly'::regclass)) > 0 as monthly_grid_uses_train_view;
