'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function runBaselineForecastAction(formData: FormData) {
  await requireAdmin();
  const note = String(formData.get('note') ?? '').trim() || null;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.schema('core').rpc('run_baseline_forecast', { p_note: note });
  if (error) throw new Error(error.message);
  revalidatePath('/admin/forecast-runs');
  return data;
}
