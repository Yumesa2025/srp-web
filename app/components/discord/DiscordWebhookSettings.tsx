'use client';

import { useRef, useState } from 'react';
import { useDiscordWebhook } from '@/app/hooks/useDiscordWebhook';

export default function DiscordWebhookSettings() {
  const { url, isLoading, saveUrl } = useDiscordWebhook();
  const inputRef = useRef<HTMLInputElement>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // 입력창은 비제어로 둔다. 저장값이 준비된 뒤에 마운트되므로 defaultValue로
  // 초기값이 채워지고, 편집 중인 문자열을 별도 상태로 따라다닐 필요가 없다.
  const handleSave = () => {
    setError('');
    setSaved(false);
    const result = saveUrl(inputRef.current?.value ?? '');
    if (result.error) {
      setError(result.error);
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="p-4 bg-gray-800/60 rounded-xl border border-gray-700/60">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🔔</span>
        <h4 className="text-sm font-bold text-gray-200">Discord Webhook 연동</h4>
      </div>
      <p className="text-xs text-gray-500 mb-3">
        Discord 채널 설정 → 연동 → 웹후크에서 URL을 복사해 붙여넣으세요.
      </p>

      {isLoading ? (
        <div className="h-9 bg-gray-700/40 rounded-lg animate-pulse" />
      ) : (
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            defaultValue={url}
            placeholder="https://discord.com/api/webhooks/..."
            className="flex-1 min-w-0 px-3 py-2 bg-gray-900 border border-gray-700 focus:border-cyan-500 rounded-lg text-xs text-white focus:outline-none transition-colors"
          />
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-colors whitespace-nowrap"
          >
            {saved ? '저장됨 ✓' : '저장'}
          </button>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      {saved && (
        <p className="mt-2 text-xs text-emerald-400">Webhook URL이 저장되었습니다.</p>
      )}

      <p className="mt-3 text-[11px] text-gray-600 leading-relaxed">
        이 브라우저에만 저장됩니다. 다른 기기나 시크릿 창에서는 다시 입력해야 합니다.
      </p>
    </div>
  );
}
