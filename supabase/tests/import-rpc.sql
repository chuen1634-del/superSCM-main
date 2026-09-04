select has_function_privilege(
  'authenticated',
  'core.import_approved_batch(uuid)',
  'execute'
) as import_rpc_execute_granted,
has_function_privilege(
  'authenticated',
  'core.rollback_batch(uuid)',
  'execute'
) as rollback_rpc_execute_granted;

select exists (
  select 1 from pg_proc
  where pronamespace = 'core'::regnamespace
    and proname = 'import_approved_batch'
) as import_rpc_exists;

select exists (
  select 1 from pg_proc
  where pronamespace = 'core'::regnamespace
    and proname = 'rollback_batch'
) as rollback_rpc_exists;
