"use client";

import { ClinicLogSummary } from "@/app/types/clinic";

interface ClinicOverviewSectionProps {
  summary: ClinicLogSummary;
  formatDurationSec: (durationSec: number) => string;
}

export default function ClinicOverviewSection({ summary, formatDurationSec }: ClinicOverviewSectionProps) {
  return (
    <>
      <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
        <div className="p-4 bg-gray-900 rounded-lg border border-red-800/70">
          <div className="text-gray-400 text-xs">총 사망 / 유효 사망</div>
          <div className="text-red-300 text-xl font-bold mt-1">
            {summary.totalDeaths} / {summary.meaningfulDeathsCount}
          </div>
        </div>
        <div className="p-4 bg-gray-900 rounded-lg border border-orange-800/70">
          <div className="text-gray-400 text-xs">사망 시작 시점</div>
          <div className="text-orange-300 text-xl font-bold mt-1">
            {typeof summary.deathStartSec === "number" ? formatDurationSec(summary.deathStartSec) : "-"}
          </div>
        </div>
        <div className="p-4 bg-gray-900 rounded-lg border border-amber-800/70">
          <div className="text-gray-400 text-xs">생존기 미사용 추정</div>
          <div className="text-amber-300 text-xl font-bold mt-1">{summary.defensiveMissingCount}회</div>
        </div>
        <div className="p-4 bg-gray-900 rounded-lg border border-cyan-800/70">
          <div className="text-gray-400 text-xs">막바지 대량 전멸 제외</div>
          <div className="text-cyan-300 text-base font-bold mt-1">
            {summary.wipeTail.detected && typeof summary.wipeTail.startSec === "number"
              ? `${formatDurationSec(summary.wipeTail.startSec)} 이후 ${summary.excludedTailDeaths}회`
              : "없음"}
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-gray-900 rounded-lg border border-gray-700">
          <div className="text-sm font-bold text-red-300 mb-2">주요 사망 원인</div>
          <div className="flex flex-wrap gap-2">
            {summary.topCauses.length > 0 ? (
              summary.topCauses.slice(0, 8).map((cause) => (
                <span key={cause.ability} className="text-xs px-2 py-1 rounded border border-red-700/60 bg-red-950/40 text-red-200">
                  {cause.ability} ({cause.count})
                </span>
              ))
            ) : (
              <span className="text-xs text-gray-500">데이터 없음</span>
            )}
          </div>
        </div>
        <div className="p-4 bg-gray-900 rounded-lg border border-gray-700">
          <div className="text-sm font-bold text-orange-300 mb-2">반복 사망 대상</div>
          <div className="flex flex-wrap gap-2">
            {summary.playerDeaths.length > 0 ? (
              summary.playerDeaths.slice(0, 8).map((player) => (
                <span key={player.name} className="text-xs px-2 py-1 rounded border border-orange-700/60 bg-orange-950/40 text-orange-200">
                  {player.name} ({player.count})
                </span>
              ))
            ) : (
              <span className="text-xs text-gray-500">데이터 없음</span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-gray-900 rounded-lg border border-indigo-800/70">
          <div className="text-xs text-gray-400">생석 사용 합계</div>
          <div className="text-indigo-300 text-xl font-bold mt-1">{summary.consumables.totals.healthstone}</div>
        </div>
        <div className="p-4 bg-gray-900 rounded-lg border border-emerald-800/70">
          <div className="text-xs text-gray-400">치유 물약 사용 합계</div>
          <div className="text-emerald-300 text-xl font-bold mt-1">{summary.consumables.totals.healingPotion}</div>
        </div>
        <div className="p-4 bg-gray-900 rounded-lg border border-sky-800/70">
          <div className="text-xs text-gray-400">딜 물약 사용 합계</div>
          <div className="text-sky-300 text-xl font-bold mt-1">{summary.consumables.totals.dpsPotion}</div>
        </div>
      </div>
    </>
  );
}
