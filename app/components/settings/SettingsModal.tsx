'use client';

import { useEffect } from 'react';
import DiscordWebhookSettings from '@/app/components/discord/DiscordWebhookSettings';

interface Props {
  onClose: () => void;
}

/** 브라우저에 저장되는 사용자 설정을 모아두는 모달 */
export default function SettingsModal({ onClose }: Props) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-gray-100">설정</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white text-sm p-1 transition-colors"
            aria-label="설정 닫기"
          >
            ✕
          </button>
        </div>

        <DiscordWebhookSettings />
      </div>
    </div>
  );
}
