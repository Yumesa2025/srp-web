'use server'

import { createClient } from '../utils/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

function getString(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : null;
}

export async function login(formData: FormData) {
  const email = getString(formData, 'email');
  const password = getString(formData, 'password');

  if (!email || !password) {
    return { error: '이메일과 비밀번호를 모두 입력해주세요.' }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  return { success: true, message: '' }
}

export async function signup(formData: FormData) {
  const email = getString(formData, 'email');
  const password = getString(formData, 'password');

  if (!email || !password) {
    return { error: '이메일과 비밀번호를 모두 입력해주세요.' }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signUp({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  return { success: true, message: '회원가입이 완료되었습니다. 이메일을 확인하거나 로그인해 주세요.' }
}

export async function signout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
}

export async function deleteAccount(): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인 상태가 아닙니다.' }

  const userId = user.id

  // 1. 사용자 데이터 삭제
  await supabase.from('raid_sessions').delete().eq('user_id', userId)
  await supabase.from('rosters').delete().eq('user_id', userId)

  // 2. auth.users 삭제 (service_role 필요)
  const adminClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
  const { error } = await adminClient.auth.admin.deleteUser(userId)
  if (error) return { error: '계정 삭제에 실패했습니다.' }

  // 3. 세션 종료
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  return {}
}
