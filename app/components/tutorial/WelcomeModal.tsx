'use client';

import { createPortal } from 'react-dom';

interface Props {
  onStart: () => void;
}

export default function WelcomeModal({ onStart }: Props) {
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-gray-900 border border-gray-700 rounded-3xl shadow-2xl overflow-hidden">

        {/* 텍스트 영역 */}
        <div className="px-14 pt-10 pb-12 flex flex-col gap-8">
          {/* 앱 이름 */}
          <div>
            <h2 className="text-white font-bold text-4xl leading-snug">
              Smart Raid Planner
            </h2>
            <p className="text-gray-400 text-xl mt-4 leading-relaxed">
              Smart Raid Plan 건전한 피드백 애드온이 필요합니다.
            </p>
          </div>

          {/* 튜토리얼 위치 안내 */}
          <p className="text-gray-600 text-base leading-relaxed">
            튜토리얼은 상단 <span className="text-gray-500 font-semibold">도움말</span> 탭 → <span className="text-gray-500 font-semibold">회원</span> 섹션에서 언제든 다시 확인할 수 있습니다.
          </p>

          {/* 튜토리얼 시작 버튼 */}
          <div className="flex justify-end">
            <button
              onClick={onStart}
              className="px-10 py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition-colors text-xl"
            >
              튜토리얼 시작 →
            </button>
          </div>
        </div>
      </div>
    </div>,
    typeof document !== 'undefined' ? document.body : (null as unknown as Element)
  );
}
