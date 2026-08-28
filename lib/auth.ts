import { redirect } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { normalizeRole, type AppRole, type AppUserProfile } from './auth-model';

export class AuthError extends Error { constructor(public status: 401 | 403, message: string) { super(message); } }

export async function getRole(): Promise<AppRole | null> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.schema('core').from('app_user').select('role, active').eq('user_id', user.id).maybeSingle();
  if (!data?.active) return null;
  return normalizeRole(data.role);
}

export async function requireUser(): Promise<{ authUser: User; profile: AppUserProfile }> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase.schema('core').from('app_user').select('*').eq('user_id', user.id).maybeSingle();
  if (!profile?.active || !normalizeRole(profile.role)) throw new AuthError(403, '활성화된 사용자 권한이 필요합니다.');
  return { authUser: user, profile: profile as AppUserProfile };
}

export async function requireAdmin(): Promise<{ authUser: User; profile: AppUserProfile }> {
  const context = await requireUser();
  if (context.profile.role !== 'ADMIN') throw new AuthError(403, '관리자 권한이 필요합니다.');
  return context;
}
