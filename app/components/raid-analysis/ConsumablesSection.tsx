'use client';

import { useState } from 'react';
import type { ConsumableRow } from '@/app/types/raidAnalysis';

interface Props {
  consumables: ConsumableRow[];
  makePlayerUrl: (actorId: number) => string;
}

function StatusCell({ value }: { value: string | boolean | null }) {
  if (value === true) {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-black bg-emerald-800/60 text-emerald-300">
        O
      </span>
    );
  }
  if (!value) {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-black bg-red-900/40 text-red-400">
        X
      </span>
    );
  }
  // string value = potion name
  return (
    <span className="px-2 py-0.5 bg-emerald-900/40 border border-emerald-700/40 text-emerald-300 text-xs rounded-md font-medium whitespace-nowrap">
      {value as string}
    </span>
  );
}

export default function ConsumablesSection({ consumables, makePlayerUrl }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  const dpsMissing    = consumables.filter(c => !c.dpsPotion).length;
  const stoneMissing  = consumables.filter(c => !c.healthstone).length;
  const healMissing   = consumables.filter(c => !c.healingPotion).length;

  return (
    <div className="bg-gray-800/60 rounded-xl border border-yellow-500/20 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-700/60 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => setCollapsed(v => !v)} className="text-gray-400 hover:text-white text-sm">
            {collapsed ? '▶' : '▼'}
          </button>
          <div>
            <h3 className="text-yellow-300 font-bold text-base">💊 소모품 체크</h3>
            <p className="text-xs text-gray-500 mt-0.5">공격물약 · 생명석 · 치유물약</p>
          </div>
        </div>
        <div className="flex gap-3 text-xs text-gray-500">
          <span>❌ 공격물약 <span className="text-red-400 font-bold">{dpsMissing}</span>명</span>
          <span>❌ 생명석 <span className="text-red-400 font-bold">{stoneMissing}</span>명</span>
          <span>❌ 치유물약 <span className="text-red-400 font-bold">{healMissing}</span>명</span>
        </div>
      </div>

      {!collapsed && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700/60 text-xs text-gray-500 bg-gray-900/40">
                <th className="text-left px-5 py-2.5 font-semibold">플레이어</th>
                <th className="text-center px-4 py-2.5 font-semibold">공격물약</th>
                <th className="text-center px-4 py-2.5 font-semibold">생명석</th>
                <th className="text-center px-4 py-2.5 font-semibold">치유물약</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {consumables.map(row => {
                const allOk = row.dpsPotion && row.healthstone && row.healingPotion;
                return (
                  <tr key={row.name} className={`transition-colors hover:bg-gray-800/40 ${allOk ? '' : 'bg-red-950/10'}`}>
                    <td className="px-5 py-2.5">
                      <a
                        href={makePlayerUrl(row.actorId)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-200 text-sm font-medium hover:text-cyan-400 hover:underline transition-colors"
                      >
                        {row.name}
                      </a>
                    </td>
                    <td className="px-4 py-2.5 text-center"><StatusCell value={row.dpsPotion} /></td>
                    <td className="px-4 py-2.5 text-center"><StatusCell value={row.healthstone} /></td>
                    <td className="px-4 py-2.5 text-center"><StatusCell value={row.healingPotion} /></td>
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
