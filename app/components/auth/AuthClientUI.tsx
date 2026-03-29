'use client';

import { useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { login, signup, signout } from '@/app/actions/auth';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/app/utils/supabase/client';
import ProfileModal from '@/app/components/profile/ProfileModal';
import type { ProfileSummary } from '@/app/types/profile';

const supabase = createClient();

export default function AuthClientUI({ user, profile }: { user: User | null; profile: ProfileSummary | null }) {
  const [isAuthOpen,    setIsAuthOpen]    = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLoginMode,   setIsLoginMode]   = useState(true);
  const [isPending,     startTransition]  = useTransition();
  const [isOAuthPending, setIsOAuthPending] = useState(false);
  const [errorMsg,   setErrorMsg]   = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const avatarUrl = profile?.avatar_url ?? undefined;
  const displayName = profile?.display_name ?? user?.email?.split('@')[0] ?? '사용자';

  const handleSignOut = () => {
    startTransition(async () => { await signout(); });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    const form = e.currentTarget;
    const formData = new FormData(form);

    if (!isLoginMode) {
      const password = formData.get('password');
      const passwordConfirm = formData.get('passwordConfirm');

      if (typeof password === 'string' && typeof passwordConfirm === 'string' && password !== passwordConfirm) {
        setErrorMsg('비밀번호와 비밀번호 확인이 일치하지 않습니다.');
        return;
      }
    }

    startTransition(async () => {
      const result = isLoginMode ? await login(formData) : await signup(formData);
      if (result?.error) {
        setErrorMsg(result.error);
      } else if (result?.success) {
        if (!isLoginMode && result.message) {
          setSuccessMsg(result.message);
        } else {
          setIsAuthOpen(false);
          form.reset();
        }
      }
    });
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setIsOAuthPending(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) { setErrorMsg(error.message); setIsOAuthPending(false); }
  };

  // ── 로그인 상태 ──────────────────────────────────────────
  if (user) {
    return (
      <>
        <div className="flex items-center gap-2 bg-gray-800/80 backdrop-blur-md px-3 py-2 rounded-full border border-gray-700 shadow-lg pointer-events-auto">
          {/* 프로필 버튼 */}
          <button
            onClick={() => setIsProfileOpen(true)}
            className="flex items-center gap-2.5 px-2 py-1 rounded-full hover:bg-gray-700/60 transition-colors group"
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-7 h-7 rounded-full border border-gray-600 object-cover"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center text-xs font-black text-white">
                {displayName[0]?.toUpperCase()}
              </div>
            )}
            <span className="text-sm font-semibold text-gray-200 group-hover:text-white transition-colors">
              {displayName}
            </span>
            <svg className="w-3 h-3 text-gray-500 group-hover:text-gray-300 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <div className="w-px h-4 bg-gray-600" />

          <button
            onClick={handleSignOut}
            disabled={isPending}
            className="px-3 py-1.5 text-xs font-bold text-gray-400 hover:text-white transition-colors disabled:opacity-50 rounded-full hover:bg-gray-700/60"
          >
            {isPending ? '처리 중...' : '로그아웃'}
          </button>
        </div>

        {/* 프로필 모달 */}
        {isProfileOpen && typeof document !== 'undefined' && createPortal(
          <ProfileModal user={user} profile={profile} onClose={() => setIsProfileOpen(false)} />,
          document.body
        )}
      </>
    );
  }

  // ── 비로그인 상태 ────────────────────────────────────────
  return (
    <div className="pointer-events-auto">
      <div className="flex gap-3 bg-gray-800/80 backdrop-blur-md px-3 py-2 rounded-full border border-gray-700 shadow-lg">
        <button
          onClick={() => { setIsLoginMode(true); setIsAuthOpen(true); }}
          className="px-5 py-2 text-sm font-bold text-gray-200 hover:text-white hover:bg-gray-700 rounded-full transition-all"
        >
          로그인
        </button>
        <button
          onClick={() => { setIsLoginMode(false); setIsAuthOpen(true); }}
          className="px-5 py-2 text-sm font-bold bg-cyan-600 hover:bg-cyan-500 text-white rounded-full transition-all shadow-[0_0_15px_rgba(8,145,178,0.4)]"
        >
          회원가입
        </button>
      </div>

      {isAuthOpen && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setIsAuthOpen(false); }}
        >
          <div className="relative w-full max-w-sm bg-gray-900 border border-gray-700 shadow-2xl rounded-3xl p-8">
            <button
              onClick={() => setIsAuthOpen(false)}
              className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-white transition-colors text-sm"
            >
              ✕
            </button>

            <h2 className="text-2xl font-black text-white mb-6 text-center tracking-tight">
              {isLoginMode ? 'SRP 환영합니다!' : 'SRP 시작하기'}
            </h2>

            {errorMsg && (
              <div className="mb-4 p-3 bg-red-900/30 border border-red-800 rounded-xl text-red-400 text-sm text-center font-medium">
                {errorMsg}
              </div>
            )}
            {successMsg && (
              <div className="mb-4 p-3 bg-emerald-900/30 border border-emerald-800 rounded-xl text-emerald-400 text-sm text-center font-medium leading-relaxed">
                {successMsg}
              </div>
            )}

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isPending || isOAuthPending}
              className="w-full mb-4 flex items-center justify-center gap-3 px-4 py-3 bg-white hover:bg-gray-100 disabled:bg-gray-300 text-gray-900 font-bold rounded-xl transition-all shadow-md"
            >
              <span className="text-lg leading-none">G</span>
              <span>{isOAuthPending ? 'Google로 이동 중...' : 'Google로 계속하기'}</span>
            </button>

            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-700" />
              </div>
              <div className="relative flex justify-center text-xs uppercase tracking-[0.2em] text-gray-500">
                <span className="bg-gray-900 px-3">또는</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">이메일</label>
                <input
                  type="email" name="email" required
                  placeholder="예: email@domain.com"
                  className="w-full px-4 py-3 bg-gray-800 border-2 border-transparent focus:border-cyan-500 rounded-xl text-white focus:outline-none transition-all text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">비밀번호</label>
                <input
                  type="password" name="password" required
                  placeholder="비밀번호 입력"
                  className="w-full px-4 py-3 bg-gray-800 border-2 border-transparent focus:border-cyan-500 rounded-xl text-white focus:outline-none transition-all text-sm"
                />
                {!isLoginMode && (
                  <p className="mt-2 text-xs leading-relaxed text-gray-500">
                    10자 이상, 영문 대문자/소문자, 숫자, 특수문자를 각각 1자 이상 포함해야 합니다.
                  </p>
                )}
              </div>
              {!isLoginMode && (
                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">비밀번호 확인</label>
                  <input
                    type="password"
                    name="passwordConfirm"
                    required
                    placeholder="비밀번호 다시 입력"
                    className="w-full px-4 py-3 bg-gray-800 border-2 border-transparent focus:border-cyan-500 rounded-xl text-white focus:outline-none transition-all text-sm"
                  />
                </div>
              )}
              <button
                type="submit" disabled={isPending}
                className="mt-2 w-full py-3.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-400 text-white font-bold rounded-xl transition-all shadow-lg text-sm"
              >
                {isPending ? '처리 중...' : isLoginMode ? '로그인' : '회원가입'}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-400">
              {isLoginMode ? (
                <>계정이 없으신가요?{' '}
                  <button onClick={() => { setIsLoginMode(false); setErrorMsg(''); setSuccessMsg(''); }} className="text-cyan-400 font-bold hover:underline ml-1">
                    회원가입
                  </button>
                </>
              ) : (
                <>이미 계정이 있으신가요?{' '}
                  <button onClick={() => { setIsLoginMode(true); setErrorMsg(''); setSuccessMsg(''); }} className="text-cyan-400 font-bold hover:underline ml-1">
                    로그인
                  </button>
                </>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
