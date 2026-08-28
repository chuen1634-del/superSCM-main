select to_regclass('raw.business_event') is not null as business_event_exists,
       to_regclass('raw.sales_order') is not null as sales_order_exists,
       to_regclass('raw.item_substitute') is not null as item_substitute_exists,
       to_regclass('core.policy_config') is not null as policy_config_exists,
       to_regclass('core.outlier_rule') is not null as outlier_rule_exists,
       to_regclass('core.item_policy') is not null as item_policy_exists,
       to_regclass('core.forecast_setting') is not null as forecast_setting_exists;

select has_column_privilege('anon', 'raw.usage_history', 'select') as anon_raw_select,
       has_table_privilege('anon', 'core.policy_config', 'insert') as anon_policy_insert,
       has_function_privilege('authenticated', 'core.is_admin()', 'execute') as is_admin_available;

select (train_start is null or train_end < test_start) as train_before_test,
       train_window_ok,
       test_window_ok,
       train_row_count,
       test_row_count
from analytics.v_data_coverage;
