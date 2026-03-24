'use client';

import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceArea, ReferenceLine } from 'recharts';
import type { AllPlayerData, BloodlustEvent } from '@/app/types/raidAnalysis';
import { getClassColor } from '@/app/constants/classColors';
import { getSpecIconUrl } from '@/app/constants/specIcons';

interface Props {
  allPlayers: AllPlayerData[];
  bloodlusts: BloodlustEvent[];
  durationSec: number;
  makePlayerUrl: (actorId: number) => string;
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

const PI_DURATION_SEC = 20;

function PlayerCard({
  player,
  bloodlusts,
  makePlayerUrl,
}: {
  player: AllPlayerData;
  bloodlusts: BloodlustEvent[];
  makePlayerUrl: (actorId: number) => string;
}) {
  const [activeTab, setActiveTab] = useState<'dps' | 'hps'>('dps');
  const { name, actorId, className, specId, dpsTimeline, hpsTimeline,
    totalDamage, avgDps, maxDps, bloodlustAvgDps,
    totalHealing, avgHps, maxHps, bloodlustAvgHps,
    defensiveCasts, piTimings } = player;

  const classColor = getClassColor(className);
  const iconUrl = getSpecIconUrl(specId);
  const isDpsTab = activeTab === 'dps';
  const timeline = isDpsTab ? dpsTimeline : hpsTimeline;
  const timelineKey = isDpsTab ? 'dps' : 'hps';
  const lineColor = isDpsTab ? '#a78bfa' : '#34d399';
  const avgValue = isDpsTab ? avgDps : avgHps;
  const totalValue = isDpsTab ? totalDamage : totalHealing;
  const maxValue = isDpsTab ? maxDps : maxHps;
  const bloodlustAvg = isDpsTab ? bloodlustAvgDps : bloodlustAvgHps;
  const avgLabel = isDpsTab ? 'DPS' : 'HPS';
  const totalLabel = isDpsTab ? '총 딜' : '총 힐';
  const lastSec = timeline[timeline.length - 1]?.sec ?? 9999;

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-700 p-4 hover:border-gray-600 transition-colors">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          {iconUrl && <img src={iconUrl} alt="" className="w-6 h-6 rounded shrink-0" />}
          <a
            href={makePlayerUrl(actorId)}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: classColor }}
            className="font-bold text-base hover:underline transition-colors truncate"
          >
            {name} ↗
          </a>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          <button
            onClick={() => setActiveTab('dps')}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors ${activeTab === 'dps' ? 'bg-purple-700 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
          >딜</button>
          <button
            onClick={() => setActiveTab('hps')}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors ${activeTab === 'hps' ? 'bg-emerald-700 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
          >힐</button>
          <div className="text-right ml-1">
            <p style={{ color: lineColor }} className="font-black font-mono text-lg leading-none">{formatK(avgValue)}</p>
            <p className="text-gray-500 text-xs">{avgLabel}</p>
          </div>
        </div>
      </div>

      {/* 서브 스탯 */}
      <div className="flex gap-4 mb-2 text-xs text-gray-500 flex-wrap">
        <span>{totalLabel} <span className="text-gray-200 font-semibold">{formatK(totalValue)}</span></span>
        <span>최고 <span className="text-gray-200 font-semibold">{formatK(maxValue)}</span></span>
        {bloodlustAvg !== null && (
          <span>🩸 블러드 <span className="text-red-300 font-bold">{formatK(bloodlustAvg)}</span></span>
        )}
        {piTimings.length > 0 && (
          <span>💙 마력주입 <span className="text-blue-300 font-bold">{piTimings.map(secToTime).join(', ')}</span></span>
        )}
      </div>

      {/* 그래프 */}
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={timeline} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          {/* 블러드러스트 구간 */}
          {bloodlusts.map((bl, i) => (
            <ReferenceArea
              key={`bl-${i}`}
              x1={bl.timeSec}
              x2={Math.min(bl.timeSec + 40, lastSec)}
              fill="rgba(239,68,68,0.15)"
              stroke="rgba(239,68,68,0.5)"
              strokeWidth={1.5}
              label={{ value: '🔴', position: 'insideTop', fontSize: 11 }}
            />
          ))}
          {/* 마력주입 구간 */}
          {piTimings.map((t, i) => (
            <ReferenceArea
              key={`pi-${i}`}
              x1={t}
              x2={Math.min(t + PI_DURATION_SEC, lastSec)}
              fill="rgba(59,130,246,0.18)"
              stroke="rgba(59,130,246,0.55)"
              strokeWidth={1.5}
              label={{ value: '💙', position: 'insideTop', fontSize: 11 }}
            />
          ))}
          {/* 생존기 세로선 */}
          {defensiveCasts.map((c, i) => (
            <ReferenceLine
              key={`def-${i}`}
              x={c.timeSec}
              stroke="rgba(251,191,36,0.7)"
              strokeDasharray="4 3"
              strokeWidth={1.5}
              label={{ value: '🛡', position: 'top', fontSize: 10 }}
            />
          ))}
          <XAxis
            dataKey="sec"
            type="number"
            domain={[0, lastSec]}
            tickFormatter={secToTime}
            tick={{ fill: '#9ca3af', fontSize: 10 }}
            interval="preserveStartEnd"
            minTickGap={50}
          />
          <YAxis
            tickFormatter={formatK}
            tick={{ fill: '#9ca3af', fontSize: 10 }}
            width={40}
          />
          <Tooltip
            formatter={(v: number | undefined) => [`${formatK(v ?? 0)} ${avgLabel}`, '']}
            labelFormatter={(label: unknown) => secToTime(Number(label))}
            contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }}
            itemStyle={{ color: lineColor }}
            labelStyle={{ color: '#9ca3af' }}
          />
          <Line
            type="monotone"
            dataKey={timelineKey}
            stroke={lineColor}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3, fill: lineColor }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function DpsGraphSection({ allPlayers, bloodlusts, durationSec, makePlayerUrl }: Props) {
  void durationSec;
  const [collapsed, setCollapsed] = useState(false);

  if (allPlayers.length === 0) {
    return (
      <div className="p-6 bg-gray-800/60 rounded-xl border border-gray-700 text-center text-gray-500">
        플레이어 데이터가 없습니다.
      </div>
    );
  }

  return (
    <div className="bg-gray-800/60 rounded-xl border border-purple-500/20 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-700/60 flex items-start justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={() => setCollapsed(v => !v)} className="text-gray-400 hover:text-white">
            {collapsed ? '▶' : '▼'}
          </button>
          <div>
            <h3 className="text-purple-300 font-bold text-lg">📈 플레이어 그래프</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              시간별 딜/힐 · 🔴 블러드러스트 · 💙 마력주입 · 🛡 생존기
            </p>
          </div>
          <span className="text-xs text-gray-500 ml-1">({allPlayers.length}명)</span>
        </div>
        {bloodlusts.length > 0 && (
          <div className="text-sm text-gray-500 text-right shrink-0">
            <p className="text-red-400 font-semibold mb-1">🔴 블러드러스트</p>
            {bloodlusts.map((bl, i) => (
              <p key={i} className="text-xs">{bl.ability} <span className="text-gray-400">{bl.timeStr}</span></p>
            ))}
          </div>
        )}
      </div>

      {!collapsed && (
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {allPlayers.map(player => (
            <PlayerCard
              key={player.actorId}
              player={player}
              bloodlusts={bloodlusts}
              makePlayerUrl={makePlayerUrl}
            />
          ))}
        </div>
      )}
    </div>
  );
}
