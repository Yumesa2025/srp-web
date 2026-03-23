'use client';

import { useState } from 'react';

interface Props {
  onSend: () => Promise<void>;
  label?: string;
}

export default function DiscordSendButton({ onSend, label = 'Discord 전송' }: Props) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleClick = async () => {
    setStatus('sending');
    setErrorMsg('');
    try {
      await onSend();
      setStatus('ok');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (e) {
      setStatus('error');
      setErrorMsg(e instanceof Error ? e.message : '전송 실패');
      setTimeout(() => setStatus('idle'), 4000);
    }
  };

  const btnClass =
    status === 'ok'    ? 'bg-emerald-700 text-white' :
    status === 'error' ? 'bg-red-800 text-white' :
    'bg-indigo-700 hover:bg-indigo-600 text-white';

  return (
    <div className="relative inline-block">
      <button
        onClick={handleClick}
        disabled={status === 'sending'}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors disabled:opacity-50 ${btnClass}`}
      >
        <span>🔔</span>
        <span>
          {status === 'sending' ? '전송 중...' :
           status === 'ok'      ? '전송됨 ✓' :
           status === 'error'   ? '전송 실패' :
           label}
        </span>
      </button>
      {status === 'error' && errorMsg && (
        <div className="absolute left-0 top-full mt-1 w-52 px-2.5 py-1.5 bg-red-900/90 border border-red-700 rounded-lg text-xs text-red-300 z-10">
          {errorMsg}
        </div>
      )}
    </div>
  );
}
