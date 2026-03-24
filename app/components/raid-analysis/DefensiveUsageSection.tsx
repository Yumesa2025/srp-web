'use client';

import { useState } from 'react';
import type { DefensiveUsagePlayer } from '@/app/types/raidAnalysis';

interface Props {
  players: DefensiveUsagePlayer[];
  makePlayerUrl: (actorId: number) => string;
}

export default function DefensiveUsageSection({ players, makePlayerUrl }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="bg-gray-800/60 rounded-xl border border-cyan-500/20 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-700/60 flex items-center gap-3">
        <button onClick={() => setCollapsed(v => !v)} className="text-gray-400 hover:text-white text-sm">
          {collapsed ? '▶' : '▼'}
        </button>
        <div>
          <h3 className="text-cyan-300 font-bold text-base">🛡️ 생존기 사용 현황</h3>
          <p className="text-xs text-gray-500 mt-0.5">설정된 생존기 기준 사용 횟수 및 타이밍</p>
        </div>
      </div>

      {!collapsed && (
        players.length === 0 ? (
          <div className="p-5 text-center text-gray-500 text-sm">
            생존기 설정이 없거나 사용 기록이 없습니다.
          </div>
        ) : (
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
            {players.map(player => (
              <div key={player.name} className="bg-gray-900 rounded-xl border border-gray-700 p-4">
                <div className="flex items-center justify-between mb-2.5">
                  <a
                    href={makePlayerUrl(player.actorId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white font-bold text-sm hover:text-cyan-400 hover:underline transition-colors"
                  >
                    {player.name}
                  </a>
                  <span className="text-cyan-400 font-black text-base">
                    {player.casts.length}<span className="text-xs text-gray-500 ml-0.5">회</span>
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {player.casts.map((c, i) => (
                    <span key={i} className="px-2 py-0.5 bg-cyan-900/30 border border-cyan-700/30 text-cyan-300 text-xs rounded-md">
                      {c.timeStr} {c.ability}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
