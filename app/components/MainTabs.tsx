"use client";

import { MainTab } from "@/app/types";

interface MainTabsProps {
  activeTab: MainTab;
  onChange: (tab: MainTab) => void;
}

const tabs: { id: MainTab; label: string; activeClass: string; disabled?: boolean }[] = [
  { id: "ROSTER",           label: "파티원 명단",          activeClass: "bg-blue-600/90 text-white border-blue-400" },
  { id: "RAID_MARKET",      label: "공대 거래",             activeClass: "bg-amber-600/90 text-white border-amber-400" },
  { id: "TACTIC_EDITOR",   label: "전술 타임라인 에디터", activeClass: "bg-green-600/90 text-white border-green-400",  disabled: true },
  { id: "RAID_AI_ANALYSIS", label: "공대 분석",              activeClass: "bg-purple-600/90 text-white border-purple-400" },
];

export default function MainTabs({ activeTab, onChange }: MainTabsProps) {
  return (
    <div className="mb-8 p-2 rounded-2xl border border-gray-700 bg-gray-800/90 shadow-lg">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            disabled={tab.disabled}
            onClick={() => !tab.disabled && onChange(tab.id)}
            className={`relative px-4 py-3 rounded-xl text-sm md:text-base font-bold transition-colors border ${
              tab.disabled
                ? "bg-gray-900/40 text-gray-600 border-gray-800 cursor-not-allowed"
                : activeTab === tab.id
                  ? tab.activeClass
                  : "bg-gray-900/70 text-gray-300 border-gray-700 hover:bg-gray-700/70"
            }`}
          >
            {tab.label}
            {tab.disabled && (
              <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 bg-gray-700 text-gray-500 text-[10px] font-semibold rounded-full border border-gray-600">
                준비중
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
