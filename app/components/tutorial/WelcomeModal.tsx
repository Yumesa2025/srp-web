'use client';

import { createPortal } from 'react-dom';

interface Props {
  onStart: () => void;
}

export default function WelcomeModal({ onStart }: Props) {
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-[875px] bg-gray-900 border border-gray-700 rounded-3xl shadow-2xl overflow-hidden">

        {/* 텍스트 영역 */}
        <div className="px-[72px] pt-[52px] pb-[62px] flex flex-col gap-8">

          {/* 앱 이름 */}
          <h2 className="text-cyan-400 font-bold text-5xl leading-snug">
            Smart Raid Planner
          </h2>

          {/* 한줄 설명 */}
          <p className="text-gray-300 text-2xl leading-relaxed">
            공대 명단 구성, 골드 정산, 전투 분석 도구.
          </p>

          {/* 애드온 안내 + 다운로드 */}
          <div className="flex flex-col gap-3">
            <p className="text-gray-400 text-xl leading-relaxed">
              <span className="text-cyan-300 font-semibold">"Smart Raid Plan 건전한 피드백"</span> 애드온이 필요합니다.
            </p>
            <a
              href="https://www.curseforge.com/wow/addons/smart-raid-plan"
              target="_blank"
              rel="noopener noreferrer"
              className="self-start px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-lg transition-colors text-lg"
            >
              CurseForge로 다운하러가기 ↗
            </a>
          </div>

          {/* 튜토리얼 위치 안내 */}
          <p className="text-gray-600 text-base leading-relaxed">
            튜토리얼은 상단 <span className="text-gray-500 font-semibold">도움말</span> 탭 → <span className="text-gray-500 font-semibold">회원</span> 섹션에서 언제든 다시 확인할 수 있습니다.
          </p>

          {/* 튜토리얼 시작 버튼 + 제공 */}
          <div className="flex items-end justify-between">
            <p className="text-gray-600 text-sm">건전한피드백 길드 제공</p>
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
