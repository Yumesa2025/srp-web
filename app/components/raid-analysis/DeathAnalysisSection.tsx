'use client';

import { useState } from 'react';
import type { EarlyDeath } from '@/app/types/raidAnalysis';

interface Props {
  deaths: EarlyDeath[];
  makePlayerUrl: (actorId: number) => string;
}

export default function DeathAnalysisSection({ deaths, makePlayerUrl }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  const header = (
    <div className="px-5 py-4 border-b border-gray-700/60 flex items-center gap-3">
      <button onClick={() => setCollapsed(v => !v)} className="text-gray-400 hover:text-white text-sm">
        {collapsed ? '▶' : '▼'}
      </button>
      <div>
        <h3 className="text-red-300 font-bold text-base">💀 최초 사망 분석</h3>
        <p className="text-xs text-gray-500 mt-0.5">전투에서 가장 먼저 사망한 최대 3명</p>
      </div>
    </div>
  );

  if (deaths.length === 0) {
    return (
      <div className="bg-gray-800/60 rounded-xl border border-red-500/20 overflow-hidden">
        {header}
        {!collapsed && (
          <div className="p-6 text-center text-gray-500 text-sm">이 전투에서 사망 기록이 없습니다.</div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-gray-800/60 rounded-xl border border-red-500/20 overflow-hidden">
      {header}
      {!collapsed && (
        <div className="p-5 space-y-3">
          {deaths.map(death => (
            <div
              key={death.rank}
              className={`rounded-xl border p-4 ${
                death.isSkipped
                  ? 'bg-gray-900/40 border-gray-700/40 opacity-60'
                  : 'bg-gray-900 border-gray-700 hover:border-red-500/30 transition-colors'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-black shrink-0 ${
                    death.rank === 1 ? 'bg-red-700 text-white' :
                    death.rank === 2 ? 'bg-orange-700 text-white' :
                    'bg-yellow-700 text-white'
                  }`}>
                    {death.rank}
                  </span>
                  <div>
                    <a
                      href={makePlayerUrl(death.actorId)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white font-bold text-sm hover:text-cyan-400 hover:underline transition-colors"
                    >
                      {death.playerName}
                    </a>
                    <p className="text-gray-500 text-xs mt-0.5">{death.timeStr}</p>
                  </div>
                </div>

                {death.isSkipped ? (
                  <span className="text-xs bg-gray-700 text-gray-400 px-2 py-1 rounded-lg shrink-0">
                    분석 제외
                  </span>
                ) : (
                  <div className="text-right shrink-0">
                    {death.hpBefore !== null && (
                      <p className={`text-xs font-bold ${
                        death.hpBefore > 50 ? 'text-red-400' :
                        death.hpBefore > 20 ? 'text-orange-400' : 'text-yellow-400'
                      }`}>사망 전 HP {death.hpBefore}%</p>
                    )}
                  </div>
                )}
              </div>

              {death.isSkipped ? (
                <p className="mt-2 text-xs text-gray-500">{death.skipReason}</p>
              ) : (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-gray-500 text-xs">사망 원인</span>
                    <span className="px-2 py-0.5 bg-red-900/40 border border-red-800/40 text-red-300 text-xs rounded-md font-semibold">
                      {death.cause}
                    </span>
                  </div>

                  <div className="flex items-start gap-2 flex-wrap">
                    <span className="text-gray-500 text-xs shrink-0 mt-0.5">생존기</span>
                    {death.defensivesUsed.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {death.defensivesUsed.map(d => (
                          <span key={d} className="px-2 py-0.5 bg-emerald-900/40 border border-emerald-700/40 text-emerald-300 text-xs rounded-md">
                            ✓ {d}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="px-2 py-0.5 bg-gray-800 text-gray-500 text-xs rounded-md border border-gray-700">
                        사용 없음
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
