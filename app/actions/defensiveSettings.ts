'use server';

import { createClient } from '@/app/utils/supabase/server';
import { DEFAULT_DEFENSIVE_SETTINGS } from '@/app/constants/defensiveDefaults';

export async function getDefensiveSettings(): Promise<Record<string, string[]>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return DEFAULT_DEFENSIVE_SETTINGS;

  const { data } = await supabase
    .from('user_settings')
    .select('defensive_settings')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!data?.defensive_settings) return DEFAULT_DEFENSIVE_SETTINGS;
  return data.defensive_settings as Record<string, string[]>;
}

export async function saveDefensiveSettings(
  settings: Record<string, string[]>
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '로그인이 필요합니다.' };

  const { error } = await supabase
    .from('user_settings')
    .upsert({ user_id: user.id, defensive_settings: settings }, { onConflict: 'user_id' });

  if (error) return { error: '저장에 실패했습니다.' };
  return {};
}

export async function resetDefensiveSettings(): Promise<{ error?: string }> {
  return saveDefensiveSettings(DEFAULT_DEFENSIVE_SETTINGS);
}
