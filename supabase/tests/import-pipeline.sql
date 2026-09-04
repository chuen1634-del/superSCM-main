select to_regclass('core.upload_batch') is not null as upload_batch_exists,
       to_regclass('core.import_staging') is not null as import_staging_exists,
       to_regclass('core.validation_error') is not null as validation_error_exists,
       to_regclass('core.column_mapping') is not null as column_mapping_exists,
       to_regclass('core.import_backup') is not null as import_backup_exists;

select has_table_privilege('anon', 'core.upload_batch', 'insert') as anon_upload_insert,
       has_table_privilege('anon', 'core.import_staging', 'insert') as anon_staging_insert,
       has_table_privilege('anon', 'core.validation_error', 'insert') as anon_error_insert;

select relrowsecurity as upload_batch_rls,
       (select relrowsecurity from pg_class where oid = 'core.import_staging'::regclass) as staging_rls,
       (select relrowsecurity from pg_class where oid = 'core.validation_error'::regclass) as validation_error_rls
from pg_class
where oid = 'core.upload_batch'::regclass;

select count(*) as core_import_policies
from pg_policies
where schemaname = 'core'
  and tablename in ('upload_batch', 'import_staging', 'validation_error', 'column_mapping', 'import_backup');

select has_function_privilege('authenticated', 'core.import_approved_batch(uuid)', 'execute') as import_rpc_granted,
       has_function_privilege('authenticated', 'core.rollback_batch(uuid)', 'execute') as rollback_rpc_granted;
