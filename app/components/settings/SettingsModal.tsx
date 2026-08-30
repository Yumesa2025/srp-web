'use client';

import { useEffect } from 'react';
import DiscordWebhookSettings from '@/app/components/discord/DiscordWebhookSettings';

interface Props {
  onClose: () => void;
}

/**
 * 설정 모달
 *
 * 로그인을 제거하면서 프로필 모달이 사라졌는데, Discord 웹훅 설정 UI가 그 안에만
 * 있었다. 로그인 없이도 접근할 수 있는 자리로 옮겨 담는 것이 이 모달의 역할이다.
 */
export default function SettingsModal({ onClose }: Props) {
  // ESC로 닫기
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
