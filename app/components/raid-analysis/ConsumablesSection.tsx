'use client';

import { useState } from 'react';
import type { ConsumableRow } from '@/app/types/raidAnalysis';
import { getClassColor } from '@/app/constants/classColors';
import { getSpecIconUrl } from '@/app/constants/specIcons';

interface Props {
  consumables: ConsumableRow[];
  makePlayerUrl: (actorId: number) => string;
}

function StatusCell({ value }: { value: string | boolean | null }) {
  if (value === true) {
    return (
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-black bg-emerald-800/60 text-emerald-300">
        O
      </span>
    );
  }
  if (!value) {
    return (
      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-black bg-red-900/40 text-red-400">
        X
      </span>
    );
  }
  return (
    <span className="px-2 py-1 bg-emerald-900/40 border border-emerald-700/40 text-emerald-300 text-sm rounded-md font-medium whitespace-nowrap">
      {value as string}
    </span>
  );
}

export default function ConsumablesSection({ consumables, makePlayerUrl }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  const dpsMissing   = consumables.filter(c => !c.dpsPotion).length;
  const stoneMissing = consumables.filter(c => !c.healthstone).length;
  const healMissing  = consumables.filter(c => !c.healingPotion).length;
  const runeMissing  = consumables.filter(c => !c.augmentRune).length;

  return (
    <div className="bg-gray-800/60 rounded-xl border border-yellow-500/20 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-700/60 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => setCollapsed(v => !v)} className="text-gray-400 hover:text-white">
            {collapsed ? '▶' : '▼'}
          </button>
          <div>
            <h3 className="text-yellow-300 font-bold text-2xl">💊 소모품 체크</h3>
            <p className="text-xl text-gray-500 mt-0.5">공격물약 · 생명석 · 치유물약</p>
          </div>
        </div>
        <div className="flex gap-4 text-xl text-gray-500">
          <span>❌ 공격물약 <span className="text-red-400 font-bold">{dpsMissing}</span>명</span>
          <span>❌ 생명석 <span className="text-red-400 font-bold">{stoneMissing}</span>명</span>
          <span>❌ 치유물약 <span className="text-red-400 font-bold">{healMissing}</span>명</span>
          <span>❌ 증강의 룬 <span className="text-red-400 font-bold">{runeMissing}</span>명</span>
        </div>
      </div>

      {!collapsed && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700/60 text-xl text-gray-500 bg-gray-900/40">
                <th className="text-left px-5 py-3 font-semibold">플레이어</th>
                <th className="text-center px-4 py-3 font-semibold">공격물약</th>
                <th className="text-center px-4 py-3 font-semibold">생명석</th>
                <th className="text-center px-4 py-3 font-semibold">치유물약</th>
                <th className="text-center px-4 py-3 font-semibold">증강의 룬</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {consumables.map(row => {
                const allOk = row.dpsPotion && row.healthstone && row.healingPotion && row.augmentRune;
                return (
                  <tr key={row.name} className={`transition-colors hover:bg-gray-800/40 ${allOk ? '' : 'bg-red-950/10'}`}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        {getSpecIconUrl(row.specId) && <img src={getSpecIconUrl(row.specId)!} alt="" className="w-5 h-5 rounded shrink-0" />}
                        <a
                          href={makePlayerUrl(row.actorId)}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: getClassColor(row.className) }}
                          className="font-semibold text-xl hover:underline transition-colors"
                        >
                          {row.name}
                        </a>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center"><StatusCell value={row.dpsPotion} /></td>
                    <td className="px-4 py-3 text-center"><StatusCell value={row.healthstone} /></td>
                    <td className="px-4 py-3 text-center"><StatusCell value={row.healingPotion} /></td>
                    <td className="px-4 py-3 text-center">
                      {row.augmentRune ? (
                        <span className="px-2 py-1 bg-yellow-900/40 border border-yellow-700/40 text-yellow-300 text-xs rounded-md font-medium whitespace-nowrap">
                          {row.augmentRune}
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-black bg-red-900/40 text-red-400">X</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
