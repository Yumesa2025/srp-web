'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { TUTORIAL_GROUPS, type TutorialItem } from '@/app/constants/tutorialData';
import type { MainTab } from '@/app/types';

interface Props {
  onClose: () => void;
  onNavigate: (tab: MainTab) => void;
}

export default function TutorialModal({ onClose, onNavigate }: Props) {
  const [selectedItem, setSelectedItem] = useState<TutorialItem>(TUTORIAL_GROUPS[0].items[0]);

  const handleNavigate = () => {
    onNavigate(selectedItem.tab);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex bg-gray-900 border border-gray-700 rounded-3xl shadow-2xl overflow-hidden">

        {/* ── 왼쪽 사이드바 ─────────────────────── */}
        <div className="w-64 shrink-0 border-r border-gray-700/60 flex flex-col bg-gray-800/40">
          {/* 헤더 */}
          <div className="px-5 py-5 border-b border-gray-700/60">
            <h2 className="text-white font-bold text-base">SRP 튜토리얼</h2>
            <p className="text-gray-500 text-xs mt-0.5">기본 기능을 하나씩 확인해보세요</p>
          </div>

          {/* 그룹 + 항목 목록 */}
          <div className="flex-1 overflow-y-auto py-4">
            {TUTORIAL_GROUPS.map((group, gi) => (
              <div key={group.id} className="flex">
                {/* 세로 진행 바 */}
                <div className="flex flex-col items-center ml-4 mr-3 shrink-0">
                  <div className="w-2.5 h-2.5 rounded-full bg-cyan-500 shrink-0 mt-1" />
                  {gi < TUTORIAL_GROUPS.length - 1 && (
                    <div className="w-px flex-1 bg-gray-600 my-1" />
                  )}
                </div>

                {/* 그룹 내용 */}
                <div className="flex-1 pb-4 min-w-0">
                  <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2 pt-0.5">
                    {group.label}
                  </p>
                  {group.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className={`w-full text-left px-2 py-2 text-sm rounded-lg transition-colors mb-0.5 ${
                        selectedItem.id === item.id
                          ? 'text-white bg-gray-700/70 border-l-2 border-cyan-500 pl-1.5'
                          : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/30'
                      }`}
                    >
                      {item.title}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── 오른쪽 콘텐츠 ─────────────────────── */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          {/* 닫기 버튼 */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-white transition-colors text-sm"
          >
            ✕
          </button>

          <div className="p-8 flex flex-col gap-5">
            {/* 제목 */}
            <h3 className="text-white font-bold text-xl pr-10">{selectedItem.title}</h3>

            {/* 이미지 placeholder */}
            <div className="w-full aspect-video bg-gray-800/80 rounded-xl border border-gray-700 flex items-center justify-center">
              <p className="text-gray-600 text-sm">이미지 준비 중</p>
            </div>

            {/* 하러가기 버튼 */}
            <div>
              <button
                onClick={handleNavigate}
                className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition-colors text-sm"
              >
                {selectedItem.actionLabel} →
              </button>
            </div>

            {/* 설명 */}
            <p className="text-gray-300 text-sm leading-relaxed">
              {selectedItem.description}
            </p>
          </div>
        </div>
      </div>
    </div>,
    typeof document !== 'undefined' ? document.body : (null as unknown as Element)
  );
}
