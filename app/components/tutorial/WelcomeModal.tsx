'use client';

import { createPortal } from 'react-dom';

interface Props {
  onStart: () => void;
}

export default function WelcomeModal({ onStart }: Props) {
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-gray-900 border border-gray-700 rounded-3xl shadow-2xl overflow-hidden">

        {/* 이미지 영역 (70%) */}
        <div className="w-full aspect-video bg-gray-800 flex items-center justify-center border-b border-gray-700">
          <p className="text-gray-600 text-sm">이미지 준비 중</p>
        </div>

        {/* 텍스트 영역 */}
        <div className="px-7 pt-5 pb-6 flex flex-col gap-4">
          {/* 메인 설명 */}
          <div>
            <h2 className="text-white font-bold text-xl leading-snug">
              WoW 공대 운영을 더 스마트하게, Smart Raid Planner입니다.
            </h2>
            <p className="text-gray-400 text-sm mt-2 leading-relaxed">
              공대 구성 자동배치, 거래 장부 정산, 공대원 퍼포먼스 분석까지 한 곳에서 관리하세요.
              건전한 피드백 길드가 직접 사용하며 만든 공대 관리 도구입니다.
            </p>
          </div>

          {/* 튜토리얼 위치 안내 */}
          <p className="text-gray-600 text-xs leading-relaxed">
            튜토리얼은 상단 <span className="text-gray-500 font-semibold">도움말</span> 탭 → <span className="text-gray-500 font-semibold">회원</span> 섹션에서 언제든 다시 확인할 수 있습니다.
          </p>

          {/* 튜토리얼 시작 버튼 */}
          <div className="flex justify-end">
            <button
              onClick={onStart}
              className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition-colors text-sm"
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
