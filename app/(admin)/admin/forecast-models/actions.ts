'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function toggleForecastModelAction(formData: FormData) {
  await requireAdmin();
  const modelId = String(formData.get('model_id') ?? '');
  const enabled = String(formData.get('enabled') ?? '') === 'true';
  if (!modelId) throw new Error('모델 ID가 없습니다.');
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.schema('core').from('model_config').update({ enabled, updated_at: new Date().toISOString() }).eq('model_id', modelId);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/forecast-models');
}
