import { createClient } from '@/app/utils/supabase/server';
import AuthClientUI from './auth/AuthClientUI';

export default async function Header() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <header className="absolute top-0 right-0 p-6 z-50 pointer-events-none w-full flex justify-end">
      {/* AuthClientUI 내부에서 포인터 이벤트를 다시 활성화해 버튼 클릭이 작동하게 합니다 */}
      <AuthClientUI user={user} />
    </header>
  );
}
