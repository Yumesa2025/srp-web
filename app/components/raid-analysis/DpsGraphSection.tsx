'use client';

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceArea } from 'recharts';
import type { DpsPlayerData, BloodlustEvent } from '@/app/types/raidAnalysis';

interface Props {
  players: DpsPlayerData[];
  bloodlusts: BloodlustEvent[];
  durationSec: number;
}

function formatK(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return String(v);
}

function secToTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function PlayerCard({ player, bloodlusts }: { player: DpsPlayerData; bloodlusts: BloodlustEvent[] }) {
  return (
    <div className="bg-gray-900 rounded-xl border border-gray-700 p-4 hover:border-purple-500/30 transition-colors">
      {/* 플레이어 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-white font-bold text-sm truncate">{player.name}</p>
        <div className="text-right shrink-0 ml-2">
          <p className="text-purple-300 font-black font-mono text-base">{formatK(player.avgDps)}</p>
          <p className="text-gray-600 text-xs">평균 DPS</p>
        </div>
      </div>
      <div className="flex gap-4 mb-3 text-xs text-gray-500">
        <span>총 딜 <span className="text-gray-300 font-semibold">{formatK(player.totalDamage)}</span></span>
        <span>최고 <span className="text-gray-300 font-semibold">{formatK(player.maxDps)}</span></span>
      </div>

      {/* 그래프 */}
      <ResponsiveContainer width="100%" height={100}>
        <LineChart data={player.timeline} margin={{ top: 2, right: 4, bottom: 0, left: 0 }}>
          {/* 블러드러스트 구간 강조 */}
          {bloodlusts.map((bl, i) => (
            <ReferenceArea
              key={i}
              x1={bl.timeSec}
              x2={Math.min(bl.timeSec + 40, player.timeline[player.timeline.length - 1]?.sec ?? 9999)}
              fill="rgba(239,68,68,0.12)"
              stroke="rgba(239,68,68,0.3)"
              strokeWidth={1}
            />
          ))}
          <XAxis
            dataKey="sec"
            tickFormatter={secToTime}
            tick={{ fill: '#6b7280', fontSize: 9 }}
            interval="preserveStartEnd"
            minTickGap={40}
          />
          <YAxis
            tickFormatter={formatK}
            tick={{ fill: '#6b7280', fontSize: 9 }}
            width={36}
          />
          <Tooltip
            formatter={(v: number | undefined) => [`${formatK(v ?? 0)} DPS`, '']}
            labelFormatter={(label: unknown) => secToTime(Number(label))}
            contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 11 }}
            itemStyle={{ color: '#a78bfa' }}
            labelStyle={{ color: '#9ca3af' }}
          />
          <Line
            type="monotone"
            dataKey="dps"
            stroke="#a78bfa"
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 3, fill: '#a78bfa' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function DpsGraphSection({ players, bloodlusts, durationSec }: Props) {
  void durationSec;

  if (players.length === 0) {
    return (
      <div className="p-6 bg-gray-800/60 rounded-xl border border-gray-700 text-center text-gray-500 text-sm">
        딜 데이터가 없습니다.
      </div>
    );
  }

  return (
    <div className="bg-gray-800/60 rounded-xl border border-purple-500/20 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-700/60 flex items-start justify-between">
        <div>
          <h3 className="text-purple-300 font-bold text-base">📈 딜러 DPS 그래프</h3>
          <p className="text-xs text-gray-500 mt-0.5">시간별 순간 DPS · 총 {players.length}명</p>
        </div>
        {bloodlusts.length > 0 && (
          <div className="text-xs text-gray-500 text-right">
            <p className="text-red-400 font-semibold mb-0.5">🔴 블러드러스트</p>
            {bloodlusts.map((bl, i) => (
              <p key={i}>{bl.ability} <span className="text-gray-400">{bl.timeStr}</span></p>
            ))}
          </div>
        )}
      </div>
      <div className="p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {players.map(player => (
          <PlayerCard key={player.name} player={player} bloodlusts={bloodlusts} />
        ))}
      </div>
    </div>
  );
}
