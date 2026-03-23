'use server'

import { createClient } from '../utils/supabase/server'
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
