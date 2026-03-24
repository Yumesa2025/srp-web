'use server';

import { createClient } from '@/app/utils/supabase/server';
import { DEFAULT_DEFENSIVE_SETTINGS } from '@/app/constants/defensiveDefaults';
import type { DefensiveEntry } from '@/app/types/raidAnalysis';

type DefensiveSettings = Record<string, DefensiveEntry[]>;

function migrateSettings(raw: unknown): DefensiveSettings {
  if (!raw || typeof raw !== 'object') return DEFAULT_DEFENSIVE_SETTINGS;
  const result: DefensiveSettings = {};
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (!Array.isArray(val)) continue;
    if (val.length === 0) { result[key] = []; continue; }
    if (typeof val[0] === 'string') {
      // Old format: string[] → DefensiveEntry[]
      result[key] = (val as string[]).map(name => ({ name }));
    } else {
      result[key] = val as DefensiveEntry[];
    }
  }
  return result;
}

export async function getDefensiveSettings(): Promise<DefensiveSettings> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return DEFAULT_DEFENSIVE_SETTINGS;

  const { data } = await supabase
    .from('user_settings')
    .select('defensive_settings')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!data?.defensive_settings) return DEFAULT_DEFENSIVE_SETTINGS;
  return migrateSettings(data.defensive_settings);
}

export async function saveDefensiveSettings(
  settings: DefensiveSettings
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
