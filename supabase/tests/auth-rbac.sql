select to_regclass('core.app_user') is not null as app_user_exists,
       to_regclass('core.audit_log') is not null as audit_log_exists;

select has_schema_privilege('anon', 'core', 'usage') as anon_core_usage,
       has_table_privilege('anon', 'core.app_user', 'insert') as anon_app_user_insert,
       has_table_privilege('anon', 'core.leadtime_plan', 'update') as anon_plan_update;

select exists (
  select 1 from pg_policies
  where schemaname = 'core' and policyname = 'app_user_admin_update'
    and roles = array['authenticated']::name[]
) as admin_update_policy_exists;

select has_function_privilege('authenticated', 'core.admin_update_user(uuid,text,boolean)', 'execute') as rpc_execute_granted;
