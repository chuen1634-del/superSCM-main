-- 운영용 RLS 정책입니다. 기존 수업용 using(true) 쓰기 정책은 제거합니다.
-- 실제 적용은 supabase/migrations/20260828000100_create_auth_rbac.sql을 먼저 실행합니다.

revoke all on schema core from anon;
revoke all on schema analytics from anon;
revoke all on all tables in schema core from anon;
revoke all on all tables in schema analytics from anon;

grant usage on schema core, analytics to authenticated;
grant select on all tables in schema core, analytics to authenticated;
revoke insert, update, delete, truncate, references, trigger on all tables in schema core from authenticated;

grant execute on function core.is_admin() to authenticated;
grant execute on function core.admin_update_user(uuid, text, boolean) to authenticated;
grant execute on function core.record_login() to authenticated;

select schemaname, tablename, policyname, roles, cmd
from pg_policies
where schemaname = 'core'
order by tablename, policyname;
