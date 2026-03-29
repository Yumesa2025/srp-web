import { createClient } from '@/app/utils/supabase/server';
import AuthClientUI from './auth/AuthClientUI';
import type { ProfileSummary } from '@/app/types/profile';

export default async function Header() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let profile: ProfileSummary | null = null;

  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('display_name, avatar_url')
      .eq('id', user.id)
      .maybeSingle();

    profile = data as ProfileSummary | null;
  }

  return (
    <header className="sticky top-0 z-50 w-full bg-gray-900/95 backdrop-blur-md border-b border-gray-800">
      <div className="max-w-[1400px] mx-auto px-6 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold text-yellow-400">
          Smart Raid Planner (SRP){' '}
          <span className="text-xs font-medium text-gray-400 align-middle">베타</span>
        </h1>
        <div className="flex items-center gap-3">
          <a
            href="#"
            title="건전한 피드백 길드 제공 (준비 중)"
            className="flex items-center gap-1.5 text-gray-400 hover:text-gray-300 transition-colors cursor-not-allowed"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
            </svg>
            <span className="text-sm text-gray-400">건전한 피드백 제공</span>
          </a>
          <AuthClientUI user={user} profile={profile} />
        </div>
      </div>
    </header>
  );
}
