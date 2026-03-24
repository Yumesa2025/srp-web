'use client';

import { useState } from 'react';
import type { EarlyDeath } from '@/app/types/raidAnalysis';
import { getClassColor } from '@/app/constants/classColors';
import { getSpecIconUrl } from '@/app/constants/specIcons';

interface Props {
  deaths: EarlyDeath[];
  makePlayerUrl: (actorId: number) => string;
}

export default function DeathAnalysisSection({ deaths, makePlayerUrl }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="bg-gray-800/60 rounded-xl border border-red-500/20 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-700/60 flex items-center gap-3">
        <button onClick={() => setCollapsed(v => !v)} className="text-gray-400 hover:text-white">
          {collapsed ? '▶' : '▼'}
        </button>
        <div>
          <h3 className="text-red-300 font-bold text-lg">💀 최초 사망 분석</h3>
          <p className="text-sm text-gray-500 mt-0.5">전투에서 가장 먼저 사망한 최대 3명</p>
        </div>
      </div>

      {!collapsed && (
        deaths.length === 0 ? (
          <div className="p-6 text-center text-gray-500">이 전투에서 사망 기록이 없습니다.</div>
        ) : (
          <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
            {deaths.map(death => (
              <div
                key={death.rank}
                className={`rounded-xl border p-4 flex flex-col gap-3 ${
                  death.isSkipped
                    ? 'bg-gray-900/40 border-gray-700/40 opacity-60'
                    : 'bg-gray-900 border-gray-700 hover:border-red-500/30 transition-colors'
                }`}
              >
                {/* 헤더: 순위 + 이름 + HP */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-black shrink-0 ${
                      death.rank === 1 ? 'bg-red-700 text-white' :
                      death.rank === 2 ? 'bg-orange-700 text-white' :
                      'bg-yellow-700 text-white'
                    }`}>
                      {death.rank}
                    </span>
                    <div className="flex items-start gap-1.5 min-w-0">
                      {getSpecIconUrl(death.specId) && <img src={getSpecIconUrl(death.specId)!} alt="" className="w-5 h-5 rounded shrink-0 mt-0.5" />}
                      <div className="min-w-0">
                        <a
                          href={makePlayerUrl(death.actorId)}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: getClassColor(death.className) }}
                          className="font-bold text-base hover:underline transition-colors leading-tight block truncate"
                        >
                          {death.playerName}
                        </a>
                        <p className="text-gray-500 text-sm">{death.timeStr}</p>
                      </div>
                    </div>
                  </div>
                  {!death.isSkipped && death.hpBefore !== null && (
                    <span className={`text-sm font-bold shrink-0 ${
                      death.hpBefore > 50 ? 'text-red-400' :
                      death.hpBefore > 20 ? 'text-orange-400' : 'text-yellow-400'
                    }`}>
                      HP {death.hpBefore}%
                    </span>
                  )}
                </div>

                {death.isSkipped ? (
                  <p className="text-sm text-gray-500">{death.skipReason}</p>
                ) : (
                  <>
                    {/* 사망 원인 */}
                    <div>
                      <p className="text-gray-500 text-xs mb-1">사망 원인</p>
                      <span className="px-2 py-1 bg-red-900/40 border border-red-800/40 text-red-300 text-sm rounded-md font-semibold">
                        {death.cause}
                      </span>
                    </div>

                    {/* 생존기 */}
                    <div>
                      <p className="text-gray-500 text-xs mb-1">생존기</p>
                      {death.defensivesUsed.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {death.defensivesUsed.map(d => (
                            <span key={d} className="px-2 py-0.5 bg-emerald-900/40 border border-emerald-700/40 text-emerald-300 text-sm rounded-md">
                              ✓ {d}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="px-2 py-0.5 bg-gray-800 text-gray-500 text-sm rounded-md border border-gray-700">
                          사용 없음
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
