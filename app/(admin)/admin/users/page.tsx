import PageHeader from '@/components/shell/page-header';
import Badge from '@/components/ui/badge';
import Panel from '@/components/ui/panel';
import EmptyValue from '@/components/ui/empty-value';
import { requireAdmin } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import UserRowForm from '../../users/user-row-form';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  const { authUser } = await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const { data: users, error } = await supabase.schema('core').from('app_user').select('user_id, email, name, department, role, active, last_login_at').order('email');
  return <><PageHeader eyebrow="ADMIN" title="사용자 관리" description="사용자의 role과 활성 상태를 관리합니다. 변경 작업은 감사 로그에 기록됩니다." />
    {error ? <Panel><p className="text-danger">사용자 조회에 실패했습니다.</p><p className="muted">{error.message}</p></Panel> : !users?.length ? <Panel><p className="muted">표시할 사용자가 없습니다.</p></Panel> : <Panel title="사용자 목록" meta={`${users.length}명`}><div className="scm-data-table-wrap"><table className="scm-data-table"><thead><tr><th>사용자</th><th>부서</th><th>권한</th><th>활성</th><th>최근 로그인</th><th>변경</th></tr></thead><tbody>{users.map((user) => <tr key={user.user_id}><td><strong>{user.name || user.email}</strong><br /><span className="muted">{user.email}</span></td><td>{user.department || <EmptyValue value={null} reasonCode="NO_DEPARTMENT" />}</td><td><Badge>{user.role}</Badge></td><td>{user.active ? <Badge status="SAFE">활성</Badge> : <Badge status="CALCULATION_UNAVAILABLE">비활성</Badge>}</td><td>{user.last_login_at ?? <EmptyValue value={null} reasonCode="NO_LOGIN" />}</td><td><UserRowForm userId={user.user_id} role={user.role} active={user.active} self={user.user_id === authUser.id} /></td></tr>)}</tbody></table></div></Panel>}
  </>;
}
