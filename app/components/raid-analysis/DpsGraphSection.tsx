'use client';

import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceArea } from 'recharts';
import type { DpsPlayerData, HpsPlayerData, BloodlustEvent } from '@/app/types/raidAnalysis';
import { getClassColor } from '@/app/constants/classColors';
import { getSpecIconUrl } from '@/app/constants/specIcons';

interface Props {
  players: DpsPlayerData[];
  hpsPlayers: HpsPlayerData[];
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

function PlayerCard({
  name,
  actorId,
  className,
  specId,
  avgLabel,
  avgValue,
  bloodlustAvg,
  totalLabel,
  totalValue,
  maxValue,
  timeline,
  timelineKey,
  lineColor,
  bloodlusts,
  makePlayerUrl,
}: {
  name: string;
  actorId: number;
  className?: string;
  specId?: number;
  avgLabel: string;
  avgValue: number;
  bloodlustAvg: number | null;
  totalLabel: string;
  totalValue: number;
  maxValue: number;
  timeline: { sec: number; [key: string]: number }[];
  timelineKey: string;
  lineColor: string;
  bloodlusts: BloodlustEvent[];
  makePlayerUrl: (actorId: number) => string;
}) {
  const lastSec = timeline[timeline.length - 1]?.sec ?? 9999;
  const classColor = getClassColor(className);
  const iconUrl = getSpecIconUrl(specId);

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-700 p-5 hover:border-gray-600 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          {iconUrl && <img src={iconUrl} alt="" className="w-6 h-6 rounded shrink-0" />}
          <a
            href={makePlayerUrl(actorId)}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: classColor }}
            className="font-bold text-lg hover:underline transition-colors truncate"
          >
            {name} ↗
          </a>
        </div>
        <div className="text-right shrink-0 ml-3">
          <p style={{ color: lineColor }} className="font-black font-mono text-xl">{formatK(avgValue)}</p>
          <p className="text-gray-500 text-sm">평균 {avgLabel}</p>
        </div>
      </div>
      <div className="flex gap-5 mb-3 text-sm text-gray-500 flex-wrap">
        <span>{totalLabel} <span className="text-gray-200 font-semibold">{formatK(totalValue)}</span></span>
        <span>최고 <span className="text-gray-200 font-semibold">{formatK(maxValue)}</span></span>
        {bloodlustAvg !== null && (
          <span className="font-semibold">
            🩸 블러드 <span className="text-red-300 font-bold">{formatK(bloodlustAvg)}</span>
          </span>
        )}
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={timeline} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          {bloodlusts.map((bl, i) => (
            <ReferenceArea
              key={i}
              x1={bl.timeSec}
              x2={Math.min(bl.timeSec + 40, lastSec)}
              fill="rgba(239,68,68,0.18)"
              stroke="rgba(239,68,68,0.6)"
              strokeWidth={2}
              label={{ value: '🔴', position: 'insideTop', fontSize: 12 }}
            />
          ))}
          <XAxis
            dataKey="sec"
            type="number"
            domain={[0, lastSec]}
            tickFormatter={secToTime}
            tick={{ fill: '#9ca3af', fontSize: 11 }}
            interval="preserveStartEnd"
            minTickGap={50}
          />
          <YAxis
            tickFormatter={formatK}
            tick={{ fill: '#9ca3af', fontSize: 11 }}
            width={44}
          />
          <Tooltip
            formatter={(v: number | undefined) => [`${formatK(v ?? 0)} ${avgLabel}`, '']}
            labelFormatter={(label: unknown) => secToTime(Number(label))}
            contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 13 }}
            itemStyle={{ color: lineColor }}
            labelStyle={{ color: '#9ca3af' }}
          />
          <Line
            type="monotone"
            dataKey={timelineKey}
            stroke={lineColor}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: lineColor }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function DpsGraphSection({ players, hpsPlayers, bloodlusts, durationSec, makePlayerUrl }: Props) {
  void durationSec;
  const [activeTab, setActiveTab] = useState<'dps' | 'hps'>('dps');
  const [collapsed, setCollapsed] = useState(false);

  const hasDps = players.length > 0;
  const hasHps = hpsPlayers.length > 0;

  if (!hasDps && !hasHps) {
    return (
      <div className="p-6 bg-gray-800/60 rounded-xl border border-gray-700 text-center text-gray-500">
        딜/힐 데이터가 없습니다.
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
            <p className="text-sm text-gray-500 mt-0.5">시간별 순간 DPS/HPS · 🔴 블러드러스트 구간</p>
          </div>
          <div className="flex gap-1.5 ml-2">
            <button
              onClick={() => setActiveTab('dps')}
              className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-colors ${activeTab === 'dps' ? 'bg-purple-700 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
            >
              딜러 ({players.length})
            </button>
            <button
              onClick={() => setActiveTab('hps')}
              className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-colors ${activeTab === 'hps' ? 'bg-emerald-700 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
            >
              힐러 ({hpsPlayers.length})
            </button>
          </div>
        </div>
        {bloodlusts.length > 0 && (
          <div className="text-sm text-gray-500 text-right shrink-0">
            <p className="text-red-400 font-semibold mb-1">🔴 블러드러스트</p>
            {bloodlusts.map((bl, i) => (
              <p key={i} className="text-sm">{bl.ability} <span className="text-gray-400">{bl.timeStr}</span></p>
            ))}
          </div>
        )}
      </div>

      {!collapsed && (
        <div className="p-5 space-y-5">
          {activeTab === 'dps' && (
            hasDps ? players.map(player => (
              <PlayerCard
                key={player.name}
                name={player.name}
                actorId={player.actorId}
                className={player.className}
                specId={player.specId}
                avgLabel="DPS"
                avgValue={player.avgDps}
                bloodlustAvg={player.bloodlustAvgDps}
                totalLabel="총 딜"
                totalValue={player.totalDamage}
                maxValue={player.maxDps}
                timeline={player.timeline}
                timelineKey="dps"
                lineColor="#a78bfa"
                bloodlusts={bloodlusts}
                makePlayerUrl={makePlayerUrl}
              />
            )) : (
              <div className="text-center text-gray-500 py-10">딜러 데이터가 없습니다.</div>
            )
          )}
          {activeTab === 'hps' && (
            hasHps ? hpsPlayers.map(player => (
              <PlayerCard
                key={player.name}
                name={player.name}
                actorId={player.actorId}
                className={player.className}
                specId={player.specId}
                avgLabel="HPS"
                avgValue={player.avgHps}
                bloodlustAvg={player.bloodlustAvgHps}
                totalLabel="총 힐"
                totalValue={player.totalHealing}
                maxValue={player.maxHps}
                timeline={player.timeline}
                timelineKey="hps"
                lineColor="#34d399"
                bloodlusts={bloodlusts}
                makePlayerUrl={makePlayerUrl}
              />
            )) : (
              <div className="text-center text-gray-500 py-10">힐러 데이터가 없습니다.</div>
            )
          )}
        </div>
      )}
    </div>
  );
}
