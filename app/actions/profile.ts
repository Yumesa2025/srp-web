'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '../utils/supabase/server'

const MAX_DISPLAY_NAME_LENGTH = 30;

export async function updateProfile(displayName: string): Promise<{ error?: string }> {
  const trimmed = displayName.trim();

  if (!trimmed) {
    return { error: '닉네임을 입력해주세요.' };
  }

  if (trimmed.length > MAX_DISPLAY_NAME_LENGTH) {
    return { error: '닉네임은 30자 이하로 입력해주세요.' };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: '로그인 상태가 아닙니다.' };
  }

  const { error } = await supabase
    .from('profiles')
    .upsert(
      {
        id: user.id,
        display_name: trimmed,
      },
      { onConflict: 'id' }
    );

  if (error) {
    return { error: '프로필 저장에 실패했습니다.' };
  }

  revalidatePath('/', 'layout');
  return {};
}
