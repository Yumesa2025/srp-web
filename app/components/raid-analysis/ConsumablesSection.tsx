'use client';

import type { ConsumableRow } from '@/app/types/raidAnalysis';

interface Props {
  consumables: ConsumableRow[];
}

function OX({ ok }: { ok: boolean }) {
  return (
    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-black ${
      ok ? 'bg-emerald-800/60 text-emerald-300' : 'bg-red-900/40 text-red-400'
    }`}>
      {ok ? 'O' : 'X'}
    </span>
  );
}

export default function ConsumablesSection({ consumables }: Props) {
  const dpsMissing   = consumables.filter(c => !c.dpsPotion).map(c => c.name);
  const stoneMissing = consumables.filter(c => !c.healthstone).map(c => c.name);
  const healMissing  = consumables.filter(c => !c.healingPotion).map(c => c.name);

  return (
    <div className="bg-gray-800/60 rounded-xl border border-yellow-500/20 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-700/60 flex items-center justify-between">
        <div>
          <h3 className="text-yellow-300 font-bold text-base">💊 소모품 체크</h3>
          <p className="text-xs text-gray-500 mt-0.5">공격물약 · 생명석 · 치유물약</p>
        </div>
        <div className="flex gap-3 text-xs text-gray-500">
          <span>❌ 공격물약 <span className="text-red-400 font-bold">{dpsMissing.length}</span>명</span>
          <span>❌ 생명석 <span className="text-red-400 font-bold">{stoneMissing.length}</span>명</span>
          <span>❌ 치유물약 <span className="text-red-400 font-bold">{healMissing.length}</span>명</span>
        </div>
      </div>

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
                    <span className="text-gray-200 text-sm font-medium">{row.name}</span>
                  </td>
                  <td className="px-4 py-2.5 text-center"><OX ok={row.dpsPotion} /></td>
                  <td className="px-4 py-2.5 text-center"><OX ok={row.healthstone} /></td>
                  <td className="px-4 py-2.5 text-center"><OX ok={row.healingPotion} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
