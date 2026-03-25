import { createClient } from '@/app/utils/supabase/server';
import AuthClientUI from './auth/AuthClientUI';

export default async function Header() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <header className="sticky top-0 z-50 w-full bg-gray-900/95 backdrop-blur-md border-b border-gray-800">
      <div className="max-w-[1400px] mx-auto px-6 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold text-yellow-400">
          Smart Raid Planner (SRP){' '}
          <span className="text-xs font-medium text-gray-400 align-middle">베타</span>
        </h1>
        <AuthClientUI user={user} />
      </div>
    </header>
  );
}
