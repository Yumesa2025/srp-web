'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';

// 설정을 열기 전에는 모달 코드를 받아오지 않는다
const SettingsModal = dynamic(() => import('@/app/components/settings/SettingsModal'));

export default function SettingsButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        title="설정"
        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm text-gray-300 hover:text-white transition-colors"
      >
        <span>⚙️</span>
        <span>설정</span>
      </button>

      {isOpen && <SettingsModal onClose={() => setIsOpen(false)} />}
    </>
  );
}
