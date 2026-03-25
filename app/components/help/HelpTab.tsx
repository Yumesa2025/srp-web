'use client';

import { useState } from 'react';

type HelpSection = 'roster' | 'market' | 'analysis' | 'account';

const TABS: { id: HelpSection; label: string }[] = [
  { id: 'roster',   label: '파티원 명단' },
  { id: 'market',   label: '공대 거래'   },
  { id: 'analysis', label: '공대 분석'   },
  { id: 'account',  label: '회원'        },
];

export default function HelpTab() {
  const [active, setActive] = useState<HelpSection>('roster');

  return (
    <div className="space-y-6">
      <div className="p-6 bg-gray-800 rounded-xl border border-gray-700 shadow-lg">
        <h2 className="text-xl font-bold text-white mb-1">도움말</h2>
        <p className="text-gray-500 text-sm">SRP 사용 방법을 안내합니다.</p>
      </div>

      {/* 서브 탭 */}
      <div className="flex gap-1 p-1 bg-gray-800/60 rounded-xl border border-gray-700">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-colors ${
              active === tab.id
                ? 'bg-gray-700 text-white'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 탭 내용 */}
      <div className="p-6 bg-gray-800/60 rounded-xl border border-gray-700 min-h-[400px]">
        {active === 'roster'   && <RosterHelp />}
        {active === 'market'   && <MarketHelp />}
        {active === 'analysis' && <AnalysisHelp />}
        {active === 'account'  && <AccountHelp />}
      </div>
    </div>
  );
}

function RosterHelp() {
  return (
    <div className="text-gray-400 text-sm">
      {/* 여기에 파티원 명단 도움말 내용을 추가하세요 */}
      <p>준비 중입니다.</p>
    </div>
  );
}

function MarketHelp() {
  return (
    <div className="text-gray-400 text-sm">
      {/* 여기에 공대 거래 도움말 내용을 추가하세요 */}
      <p>준비 중입니다.</p>
    </div>
  );
}

function AnalysisHelp() {
  return (
    <div className="text-gray-400 text-sm">
      {/* 여기에 공대 분석 도움말 내용을 추가하세요 */}
      <p>준비 중입니다.</p>
    </div>
  );
}

function AccountHelp() {
  return (
    <div className="text-gray-400 text-sm">
      {/* 여기에 회원 도움말 내용을 추가하세요 */}
      <p>준비 중입니다.</p>
    </div>
  );
}
