"use client";

import { MainTab } from "@/app/types";

interface MainTabsProps {
  activeTab: MainTab;
  onChange: (tab: MainTab) => void;
}

const tabs: { id: MainTab; label: string; activeClass: string }[] = [
  { id: "ROSTER", label: "파티원 명단", activeClass: "bg-blue-600/90 text-white border-blue-400" },
  { id: "TACTIC_EDITOR", label: "전술 타임라인 에디터", activeClass: "bg-green-600/90 text-white border-green-400" },
  { id: "RAID_AI_ANALYSIS", label: "공대 AI 분석", activeClass: "bg-purple-600/90 text-white border-purple-400" },
  { id: "RAID_MARKET", label: "공대 거래", activeClass: "bg-amber-600/90 text-white border-amber-400" },
];

export default function MainTabs({ activeTab, onChange }: MainTabsProps) {
  return (
    <div className="mb-8 p-2 rounded-2xl border border-gray-700 bg-gray-800/90 shadow-lg">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`px-4 py-3 rounded-xl text-sm md:text-base font-bold transition-colors border ${
              activeTab === tab.id
                ? tab.activeClass
                : "bg-gray-900/70 text-gray-300 border-gray-700 hover:bg-gray-700/70"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
