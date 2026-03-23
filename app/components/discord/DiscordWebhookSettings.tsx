'use client';

import { useEffect, useState, useTransition } from 'react';
import { getDiscordWebhookUrl, saveDiscordWebhookUrl } from '@/app/actions/discord';

export default function DiscordWebhookSettings() {
  const [url, setUrl] = useState('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let canceled = false;
    async function load() {
      setIsLoading(true);
      const result = await getDiscordWebhookUrl();
      if (!canceled) {
        setUrl(result.url ?? '');
        setIsLoading(false);
      }
    }
    load();
    return () => { canceled = true; };
  }, []);

  const handleSave = () => {
    setError('');
    setSaved(false);
    startTransition(async () => {
      const result = await saveDiscordWebhookUrl(url);
      if (result.error) {
        setError(result.error);
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    });
  };

  return (
    <div className="mt-4 p-4 bg-gray-800/60 rounded-xl border border-gray-700/60">
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
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://discord.com/api/webhooks/..."
            className="flex-1 min-w-0 px-3 py-2 bg-gray-900 border border-gray-700 focus:border-cyan-500 rounded-lg text-xs text-white focus:outline-none transition-colors"
          />
          <button
            onClick={handleSave}
            disabled={isPending}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors whitespace-nowrap"
          >
            {isPending ? '저장 중...' : saved ? '저장됨 ✓' : '저장'}
          </button>
        </div>
      )}

      {error && (
        <p className="mt-2 text-xs text-red-400">{error}</p>
      )}
      {saved && (
        <p className="mt-2 text-xs text-emerald-400">Webhook URL이 저장되었습니다.</p>
      )}
    </div>
  );
}
