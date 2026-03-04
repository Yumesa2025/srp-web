"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ClinicLogSummary } from "@/app/types/clinic";

interface ClinicDeepAnalysisSectionProps {
  summary: ClinicLogSummary;
}

export default function ClinicDeepAnalysisSection({ summary }: ClinicDeepAnalysisSectionProps) {
  return (
    <>
      <div className="mt-6 p-5 bg-gray-900 rounded-xl border border-gray-700">
        <div className="text-sm text-gray-300 mb-3 font-bold">🧠 플레이어별 추적 분석</div>
        <div className="overflow-x-auto max-h-[360px]">
          <table className="min-w-full text-xs text-gray-300">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-2 pr-3">이름</th>
                <th className="text-left py-2 pr-3">위험도</th>
                <th className="text-left py-2 pr-3">사망</th>
                <th className="text-left py-2 pr-3">첫/마지막 사망</th>
                <th className="text-left py-2 pr-3">평균 HP%</th>
                <th className="text-left py-2 pr-3">생존기 사용률</th>
                <th className="text-left py-2 pr-3">반복 원인</th>
                <th className="text-left py-2 pr-3">코칭 메모</th>
              </tr>
            </thead>
            <tbody>
              {summary.perPlayer.slice(0, 20).map((player) => (
                <tr key={player.playerName} className="border-b border-gray-800">
                  <td className="py-2 pr-3 font-semibold text-gray-100">{player.playerName}</td>
                  <td className="py-2 pr-3">
                    <span
                      className={`px-2 py-0.5 rounded border text-[11px] font-bold ${
                        player.risk === "HIGH"
                          ? "bg-red-950/40 text-red-300 border-red-700/70"
                          : player.risk === "MEDIUM"
                            ? "bg-amber-950/40 text-amber-300 border-amber-700/70"
                            : "bg-green-950/40 text-green-300 border-green-700/70"
                      }`}
                    >
                      {player.risk}
                    </span>
                  </td>
                  <td className="py-2 pr-3">{player.deaths}</td>
                  <td className="py-2 pr-3 font-mono">
                    {player.firstDeathTime || "-"} / {player.lastDeathTime || "-"}
                  </td>
                  <td className="py-2 pr-3">
                    {typeof player.avgHpBeforeDeath === "number" ? `${player.avgHpBeforeDeath.toFixed(1)}%` : "-"}
                  </td>
                  <td className="py-2 pr-3">
                    {typeof player.defensiveUseRate === "number" ? `${player.defensiveUseRate.toFixed(1)}%` : "-"}
                  </td>
                  <td className="py-2 pr-3">
                    {player.topCauses.length > 0 ? player.topCauses.map((cause) => `${cause.ability}(${cause.count})`).join(", ") : "-"}
                  </td>
                  <td className="py-2 pr-3">{player.notes.join(" / ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 p-5 bg-gray-900 rounded-xl border border-gray-700">
        <div className="text-sm text-gray-300 mb-3 font-bold">📉 언제부터 죽기 시작했는지 (사망 누적 그래프)</div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={summary.deathTimeline} margin={{ top: 12, right: 24, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="time" stroke="#9CA3AF" minTickGap={22} />
              <YAxis stroke="#9CA3AF" />
              <Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151" }} labelStyle={{ color: "#D1D5DB" }} />
              <Legend />
              <Line type="monotone" dataKey="cumulativeDeaths" name="누적 사망" stroke="#F87171" strokeWidth={3} dot={false} />
              <Line type="monotone" dataKey="deaths" name="해당 초 사망" stroke="#FBBF24" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-6 p-5 bg-gray-900 rounded-xl border border-gray-700">
        <div className="text-sm text-gray-300 mb-3 font-bold">🛡️ 보스 스킬 vs 생존기 시전 타임라인</div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={summary.castTimeline.filter(
                (point) => point.bossCasts > 0 || point.defensiveCasts > 0 || point.deaths > 0 || point.sec % 10 === 0
              )}
              margin={{ top: 12, right: 24, left: 8, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="time" stroke="#9CA3AF" minTickGap={22} />
              <YAxis stroke="#9CA3AF" />
              <Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151" }} labelStyle={{ color: "#D1D5DB" }} />
              <Legend />
              <Line type="monotone" dataKey="bossCasts" name="보스 스킬 수" stroke="#EF4444" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="defensiveCasts" name="생존기 시전 수" stroke="#22C55E" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="deaths" name="사망 수" stroke="#F59E0B" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-6 p-5 bg-gray-900 rounded-xl border border-gray-700">
        <div className="text-sm text-gray-300 mb-3 font-bold">🚨 먼저 죽은 인원 (의미 있는 사망 기준)</div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs text-gray-300">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-2 pr-3">시간</th>
                <th className="text-left py-2 pr-3">이름</th>
                <th className="text-left py-2 pr-3">원인 스킬</th>
                <th className="text-left py-2 pr-3">HP%</th>
                <th className="text-left py-2 pr-3">직전 생존기</th>
              </tr>
            </thead>
            <tbody>
              {summary.firstMeaningfulDeaths.slice(0, 10).map((d, idx) => (
                <tr key={`${d.playerName}-${d.time}-${idx}`} className="border-b border-gray-800">
                  <td className="py-2 pr-3 font-mono">{d.time}</td>
                  <td className="py-2 pr-3">{d.playerName}</td>
                  <td className="py-2 pr-3">{d.ability}</td>
                  <td className="py-2 pr-3">{typeof d.hpPercentBefore === "number" ? `${d.hpPercentBefore.toFixed(1)}%` : "-"}</td>
                  <td className="py-2 pr-3">{d.defensives.length > 0 ? d.defensives.join(", ") : "없음"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 p-5 bg-gray-900 rounded-xl border border-gray-700">
        <div className="text-sm text-gray-300 mb-3 font-bold">🎯 보스 스킬별 생존기 커버 현황</div>
        <div className="overflow-x-auto max-h-[340px]">
          <table className="min-w-full text-xs text-gray-300">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-2 pr-3">시간</th>
                <th className="text-left py-2 pr-3">보스 스킬</th>
                <th className="text-left py-2 pr-3">커버</th>
                <th className="text-left py-2 pr-3">근처 생존기</th>
              </tr>
            </thead>
            <tbody>
              {summary.bossCoverage.slice(0, 50).map((item, idx) => (
                <tr key={`${item.timeSec}-${item.ability}-${idx}`} className={`border-b border-gray-800 ${item.covered ? "" : "bg-red-950/20"}`}>
                  <td className="py-2 pr-3 font-mono">{item.time}</td>
                  <td className="py-2 pr-3">{item.ability}</td>
                  <td className={`py-2 pr-3 font-bold ${item.covered ? "text-green-300" : "text-red-300"}`}>{item.covered ? "있음" : "없음"}</td>
                  <td className="py-2 pr-3">{item.defensives.length > 0 ? item.defensives.join(", ") : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 p-5 bg-gray-900 rounded-xl border border-gray-700">
        <div className="text-sm text-gray-300 mb-3 font-bold">🧾 우리 공대 사망 로그 샘플</div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs text-gray-300">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-2 pr-3">시간</th>
                <th className="text-left py-2 pr-3">이름</th>
                <th className="text-left py-2 pr-3">원인 스킬</th>
                <th className="text-left py-2 pr-3">HP%</th>
                <th className="text-left py-2 pr-3">생존기</th>
                <th className="text-left py-2 pr-3">근처 보스 스킬</th>
              </tr>
            </thead>
            <tbody>
              {summary.deaths.slice(0, 12).map((d, idx) => (
                <tr key={`${d.playerName}-${d.time}-${idx}`} className="border-b border-gray-800">
                  <td className="py-2 pr-3 font-mono">{d.time}</td>
                  <td className="py-2 pr-3">{d.playerName}</td>
                  <td className="py-2 pr-3">{d.ability}</td>
                  <td className="py-2 pr-3">{typeof d.hpPercentBefore === "number" ? `${d.hpPercentBefore.toFixed(1)}%` : "-"}</td>
                  <td className="py-2 pr-3">{d.defensives.length > 0 ? d.defensives.join(", ") : "없음"}</td>
                  <td className="py-2 pr-3">{d.nearbyBossSkills.length > 0 ? d.nearbyBossSkills.join(", ") : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
