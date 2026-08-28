'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export type UserActionState = { error?: string; success?: string };

export async function updateUserAction(_state: UserActionState, formData: FormData): Promise<UserActionState> {
  const { authUser } = await requireAdmin();
  const userId = String(formData.get('user_id') ?? '');
  const role = String(formData.get('role') ?? '');
  const active = formData.get('active') === 'on';
  if (!userId || (role !== 'ADMIN' && role !== 'USER')) return { error: '사용자 변경 값이 올바르지 않습니다.' };
  if (userId === authUser.id && (role !== 'ADMIN' || !active)) return { error: '자신의 관리자 권한과 활성 상태는 변경할 수 없습니다.' };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.schema('core').rpc('admin_update_user', { target_user_id: userId, next_role: role, next_active: active });
  if (error) return { error: error.message.includes('관리자') ? error.message : '사용자 변경에 실패했습니다.' };
  revalidatePath('/admin/users');
  return { success: '사용자 정보가 저장되었습니다.' };
}
