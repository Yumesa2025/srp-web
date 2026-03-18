'use client';

import { useState, useTransition } from 'react';
import { login, signup, signout } from '@/app/actions/auth';
import type { User } from '@supabase/supabase-js';

export default function AuthClientUI({ user }: { user: User | null }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSignOut = () => {
    startTransition(async () => {
      await signout();
    });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      let result;
      if (isLoginMode) {
        result = await login(formData);
      } else {
        result = await signup(formData);
      }

      if (result?.error) {
        setErrorMsg(result.error);
      } else if (result?.success) {
        if (!isLoginMode && result.message) {
          setSuccessMsg(result.message);
        } else {
          setIsModalOpen(false);
          form.reset();
        }
      }
    });
  };

  if (user) {
    return (
      <div className="flex items-center gap-4 bg-gray-800/80 backdrop-blur-md px-5 py-2.5 rounded-full border border-gray-700 shadow-lg pointer-events-auto">
        <div className="text-sm font-medium text-gray-200">
          <span className="text-emerald-400 font-bold">{user.email?.split('@')[0]}</span> 님 환영합니다
        </div>
        <div className="w-px h-4 bg-gray-600"></div>
        <button
          onClick={handleSignOut}
          disabled={isPending}
          className="text-sm font-bold text-gray-400 hover:text-white transition-colors disabled:opacity-50"
        >
          {isPending ? '처리 중...' : '로그아웃'}
        </button>
      </div>
    );
  }

  return (
    <div className="pointer-events-auto">
      <div className="flex gap-3 bg-gray-800/80 backdrop-blur-md px-3 py-2 rounded-full border border-gray-700 shadow-lg">
        <button
          onClick={() => { setIsLoginMode(true); setIsModalOpen(true); }}
          className="px-5 py-2 text-sm font-bold text-gray-200 hover:text-white hover:bg-gray-700 rounded-full transition-all"
        >
          로그인
        </button>
        <button
          onClick={() => { setIsLoginMode(false); setIsModalOpen(true); }}
          className="px-5 py-2 text-sm font-bold bg-cyan-600 hover:bg-cyan-500 text-white rounded-full transition-all shadow-[0_0_15px_rgba(8,145,178,0.4)] hover:shadow-[0_0_20px_rgba(8,145,178,0.6)]"
        >
          회원가입
        </button>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          {/* 닫기 배경 */}
          <div className="absolute inset-0" onClick={() => setIsModalOpen(false)}></div>
          
          <div className="relative w-full max-w-sm bg-gray-900 border border-gray-700 shadow-2xl rounded-3xl p-8 animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-white transition-colors p-2 text-lg font-bold"
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

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">이메일</label>
                <input
                  type="email"
                  name="email"
                  required
                  className="w-full px-4 py-3 bg-gray-800 border-2 border-transparent focus:border-cyan-500 rounded-xl text-white focus:outline-none transition-all font-sans text-sm"
                  placeholder="예: email@domain.com"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">비밀번호</label>
                <input
                  type="password"
                  name="password"
                  required
                  className="w-full px-4 py-3 bg-gray-800 border-2 border-transparent focus:border-cyan-500 rounded-xl text-white focus:outline-none transition-all font-sans text-sm"
                  placeholder="비밀번호 입력"
                />
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="mt-6 w-full py-3.5 bg-linear-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-400 text-white font-bold rounded-xl transition-all shadow-lg text-sm tracking-wide"
              >
                {isPending ? '처리 중...' : isLoginMode ? '로그인' : '회원가입'}
              </button>
            </form>

            <div className="mt-8 text-center text-sm text-gray-400 font-medium pb-2">
              {isLoginMode ? (
                <>
                  계정이 없으신가요?{' '}
                  <button onClick={() => { setIsLoginMode(false); setErrorMsg(''); setSuccessMsg(''); }} className="text-cyan-400 font-bold hover:underline transition-colors ml-1">
                    회원가입
                  </button>
                </>
              ) : (
                <>
                  이미 계정이 있으신가요?{' '}
                  <button onClick={() => { setIsLoginMode(true); setErrorMsg(''); setSuccessMsg(''); }} className="text-cyan-400 font-bold hover:underline transition-colors ml-1">
                    로그인
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
