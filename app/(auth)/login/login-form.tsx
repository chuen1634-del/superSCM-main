'use client';

import { useActionState } from 'react';
import { loginAction, type LoginState } from './actions';

export default function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, {});
  return <form action={action} className="form-stack"><input type="hidden" name="next" value={next} /><label>이메일<input className="form-input" name="email" type="email" autoComplete="email" required /></label><label>비밀번호<input className="form-input" name="password" type="password" autoComplete="current-password" required /></label>{state.error ? <p className="text-danger" role="alert">{state.error}</p> : null}<button className="button primary" disabled={pending}>{pending ? '로그인 중…' : '로그인'}</button></form>;
}
