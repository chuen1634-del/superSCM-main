'use server';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type LoginState = { error?: string };

function safeNext(value: FormDataEntryValue | null): string {
  const next = typeof value === 'string' ? value : '/';
  return next.startsWith('/') && !next.startsWith('//') ? next : '/';
}

export async function loginAction(_state: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const next = safeNext(formData.get('next'));
  if (!email || !password) return { error: '이메일과 비밀번호를 입력해 주세요.' };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: '로그인에 실패했습니다. 이메일과 비밀번호를 확인해 주세요.' };
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.schema('core').from('app_user').select('active').eq('user_id', user?.id ?? '').maybeSingle();
  if (!profile?.active) { await supabase.auth.signOut(); return { error: '활성화된 계정만 로그인할 수 있습니다.' }; }
  await supabase.schema('core').rpc('record_login');
  redirect(next);
}
