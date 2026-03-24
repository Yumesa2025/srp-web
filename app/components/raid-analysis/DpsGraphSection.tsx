'use client';

import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceArea } from 'recharts';
import type { DpsPlayerData, HpsPlayerData, BloodlustEvent } from '@/app/types/raidAnalysis';

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
  return (
    <div className="bg-gray-900 rounded-xl border border-gray-700 p-4 hover:border-opacity-50 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <a
          href={makePlayerUrl(actorId)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-white font-bold text-sm hover:text-cyan-400 hover:underline transition-colors truncate"
        >
          {name} ↗
        </a>
        <div className="text-right shrink-0 ml-2">
          <p style={{ color: lineColor }} className="font-black font-mono text-base">{formatK(avgValue)}</p>
          <p className="text-gray-600 text-xs">평균 {avgLabel}</p>
        </div>
      </div>
      <div className="flex gap-4 mb-2 text-xs text-gray-500 flex-wrap">
        <span>{totalLabel} <span className="text-gray-300 font-semibold">{formatK(totalValue)}</span></span>
        <span>최고 <span className="text-gray-300 font-semibold">{formatK(maxValue)}</span></span>
        {bloodlustAvg !== null && (
          <span className="text-red-400 font-semibold">
            🩸 블러드 <span className="text-red-300">{formatK(bloodlustAvg)}</span>
          </span>
        )}
      </div>

      <ResponsiveContainer width="100%" height={130}>
        <LineChart data={timeline} margin={{ top: 2, right: 4, bottom: 0, left: 0 }}>
          {bloodlusts.map((bl, i) => (
            <ReferenceArea
              key={i}
              x1={bl.timeSec}
              x2={Math.min(bl.timeSec + 40, lastSec)}
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
            formatter={(v: number | undefined) => [`${formatK(v ?? 0)} ${avgLabel}`, '']}
            labelFormatter={(label: unknown) => secToTime(Number(label))}
            contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 11 }}
            itemStyle={{ color: lineColor }}
            labelStyle={{ color: '#9ca3af' }}
          />
          <Line
            type="monotone"
            dataKey={timelineKey}
            stroke={lineColor}
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 3, fill: lineColor }}
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
      <div className="p-6 bg-gray-800/60 rounded-xl border border-gray-700 text-center text-gray-500 text-sm">
        딜/힐 데이터가 없습니다.
      </div>
    );
  }

  return (
    <div className="bg-gray-800/60 rounded-xl border border-purple-500/20 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-700/60 flex items-start justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={() => setCollapsed(v => !v)} className="text-gray-400 hover:text-white text-sm">
            {collapsed ? '▶' : '▼'}
          </button>
          <div>
            <h3 className="text-purple-300 font-bold text-base">📈 플레이어 그래프</h3>
            <p className="text-xs text-gray-500 mt-0.5">시간별 순간 DPS/HPS</p>
          </div>
          <div className="flex gap-1 ml-2">
            <button
              onClick={() => setActiveTab('dps')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${activeTab === 'dps' ? 'bg-purple-700 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
            >
              딜러 ({players.length})
            </button>
            <button
              onClick={() => setActiveTab('hps')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${activeTab === 'hps' ? 'bg-emerald-700 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
            >
              힐러 ({hpsPlayers.length})
            </button>
          </div>
        </div>
        {bloodlusts.length > 0 && (
          <div className="text-xs text-gray-500 text-right shrink-0">
            <p className="text-red-400 font-semibold mb-0.5">🔴 블러드러스트</p>
            {bloodlusts.map((bl, i) => (
              <p key={i}>{bl.ability} <span className="text-gray-400">{bl.timeStr}</span></p>
            ))}
          </div>
        )}
      </div>

      {!collapsed && (
        <div className="p-5 space-y-4">
          {activeTab === 'dps' && (
            hasDps ? players.map(player => (
              <PlayerCard
                key={player.name}
                name={player.name}
                actorId={player.actorId}
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
              <div className="text-center text-gray-500 text-sm py-8">딜러 데이터가 없습니다.</div>
            )
          )}
          {activeTab === 'hps' && (
            hasHps ? hpsPlayers.map(player => (
              <PlayerCard
                key={player.name}
                name={player.name}
                actorId={player.actorId}
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
              <div className="text-center text-gray-500 text-sm py-8">힐러 데이터가 없습니다.</div>
            )
          )}
        </div>
      )}
    </div>
  );
}
