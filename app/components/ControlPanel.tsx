"use client";

import { ALL_DEFENSIVE_SKILLS } from "@/app/constants/defensiveSkills";

interface ControlPanelProps {
  inputText: string;
  onInputChange: (v: string) => void;
  bossDamage: number;
  onBossDamageChange: (v: number) => void;
  isLoading: boolean;
  onFetch: () => void;
}

export default function ControlPanel({
  inputText, onInputChange,
  bossDamage, onBossDamageChange,
  isLoading, onFetch,
}: ControlPanelProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

      {/* 파티원 명단 입력 */}
      <div className="p-6 bg-gray-800 rounded-xl shadow-lg border border-gray-700">
        <label className="block mb-2 text-gray-300 font-semibold">
          1. 파티원 명단 입력{" "}
          <span className="text-gray-500 text-xs font-normal">(이름-서버명 한 줄에 하나씩)</span>
        </label>
        <textarea
          className="w-full p-4 bg-gray-900 text-white border border-gray-600 rounded-md focus:outline-none focus:border-blue-500 resize-none font-mono text-sm"
          rows={4}
          value={inputText}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder={"닉네임-azshara\n가로쉬-azshara\n스랄-hyjal"}
        />
        <button
          onClick={onFetch}
          disabled={isLoading}
          className="mt-4 w-full px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 rounded-md font-bold transition-colors"
        >
          {isLoading ? "⏳ 데이터 로딩 중..." : "🔍 캐릭터 가져오기 및 자동 배치"}
        </button>
      </div>

      {/* 보스 데미지 입력 */}
      <div className="p-6 bg-gray-800 rounded-xl shadow-lg border border-gray-700 flex flex-col justify-center">
        <label className="block mb-2 text-red-400 font-bold text-lg">
          2. 보스 광역 데미지{" "}
          <span className="text-gray-500 text-sm font-normal">(물리 피해 기준)</span>
        </label>
        <input
          type="number"
          className="w-full p-4 text-2xl font-bold bg-gray-900 text-red-400 border border-gray-600 rounded-md focus:outline-none focus:border-red-500 text-center"
          value={bossDamage}
          onChange={(e) => onBossDamageChange(Number(e.target.value))}
        />
        <p className="mt-3 text-xs text-gray-500 text-center">
          숫자를 바꾸면 모든 카드의 생사가 실시간으로 갱신됩니다.
          <br />
          🛡️ 생존기 사전: <span className="text-blue-400 font-bold">{ALL_DEFENSIVE_SKILLS.size}개</span> 등록됨
        </p>
      </div>

    </div>
  );
}
