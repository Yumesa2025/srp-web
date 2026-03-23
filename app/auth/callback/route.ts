import { NextResponse } from 'next/server';
import { createClient } from '@/app/utils/supabase/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const origin = requestUrl.origin;
  const rawNext = requestUrl.searchParams.get('next') || '/';

  // Open Redirect 방지: 상대 경로만 허용, 외부 URL 차단
  const isRelativePath = rawNext.startsWith('/') && !rawNext.startsWith('//');
  const next = isRelativePath ? rawNext : '/';

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL(next, origin));
}
