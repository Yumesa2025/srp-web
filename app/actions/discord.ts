'use server';

import { createClient } from '@/app/utils/supabase/server';

export async function getDiscordWebhookUrl(): Promise<{ url: string | null; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { url: null, error: '로그인이 필요합니다.' };

  const { data, error } = await supabase
    .from('user_settings')
    .select('discord_webhook_url')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) return { url: null, error: '설정을 불러오지 못했습니다.' };
  return { url: data?.discord_webhook_url ?? null };
}

export async function saveDiscordWebhookUrl(url: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '로그인이 필요합니다.' };

  const trimmed = url.trim();
  if (trimmed && !trimmed.startsWith('https://discord.com/api/webhooks/')) {
    return { error: '올바른 Discord Webhook URL이 아닙니다.' };
  }

  const { error } = await supabase
    .from('user_settings')
    .upsert({ user_id: user.id, discord_webhook_url: trimmed || null }, { onConflict: 'user_id' });

  if (error) return { error: '저장에 실패했습니다.' };
  return {};
}
