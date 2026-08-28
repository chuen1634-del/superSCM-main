'use client';

import { useActionState } from 'react';
import { updateUserAction, type UserActionState } from './actions';

export default function UserRowForm({ userId, role, active, self }: { userId: string; role: 'ADMIN' | 'USER'; active: boolean; self: boolean }) {
  const [state, action, pending] = useActionState<UserActionState, FormData>(updateUserAction, {});
  return <form action={action} className="user-row-form"><input type="hidden" name="user_id" value={userId} /><select className="table-select" name="role" defaultValue={role} disabled={self}><option value="USER">USER</option><option value="ADMIN">ADMIN</option></select><label className="user-active"><input type="checkbox" name="active" defaultChecked={active} disabled={self} /> 활성</label><button className="button" disabled={pending || self}>{pending ? '저장 중…' : '저장'}</button>{state.error ? <span className="text-danger" role="alert">{state.error}</span> : state.success ? <span className="text-good" role="status">{state.success}</span> : null}</form>;
}
