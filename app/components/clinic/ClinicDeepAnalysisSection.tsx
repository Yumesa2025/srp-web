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

/** 섹션 공통 래퍼 카드 */
function SectionCard({ title, children, maxH }: { title: string; children: React.ReactNode; maxH?: string }) {
  return (
    <div className="mt-6 p-5 bg-gray-900 rounded-xl border border-gray-700">
      <div className="text-sm text-gray-300 mb-3 font-bold">{title}</div>
      <div className={maxH ? `overflow-x-auto ${maxH}` : undefined}>{children}</div>
    </div>
  );
}

/** 퍼센트 포맷 헬퍼: number이면 "X.X%", 아니면 "-" */
const fmtPct = (v: number | null | undefined) =>
  typeof v === "number" ? `${v.toFixed(1)}%` : "-";

/** 타임라인 라인차트 공통 컴포넌트 */
interface TimelineChartProps {
  data: ClinicLogSummary["castTimeline"] | ClinicLogSummary["deathTimeline"];
  height?: string;
  lines: { dataKey: string; name: string; stroke: string; strokeWidth?: number }[];
  filter?: (point: ClinicLogSummary["castTimeline"][number]) => boolean;
}

function TimelineChart({ data, height = "h-[300px]", lines, filter }: TimelineChartProps) {
  const chartData = filter
    ? (data as ClinicLogSummary["castTimeline"]).filter(filter)
    : data;
  return (
    <div className={`${height} w-full`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 12, right: 24, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="time" stroke="#9CA3AF" minTickGap={22} />
          <YAxis stroke="#9CA3AF" />
          <Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151" }} labelStyle={{ color: "#D1D5DB" }} />
          <Legend />
          {lines.map((l) => (
            <Line
              key={l.dataKey}
              type="monotone"
              dataKey={l.dataKey}
              name={l.name}
              stroke={l.stroke}
              strokeWidth={l.strokeWidth ?? 2}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

interface ClinicDeepAnalysisSectionProps {
  summary: ClinicLogSummary;
}

export default function ClinicDeepAnalysisSection({ summary }: ClinicDeepAnalysisSectionProps) {
  return (
    <>
      {/* 플레이어별 추적 분석 */}
      <SectionCard title="🧠 플레이어별 추적 분석" maxH="max-h-[360px]">
        <table className="min-w-full text-xs text-gray-300">
          <thead>
            <tr className="border-b border-gray-700">
              {["이름", "위험도", "사망", "첫/마지막 사망", "평균 HP%", "생존기 사용률", "반복 원인", "코칭 메모"].map((h) => (
                <th key={h} className="text-left py-2 pr-3">{h}</th>
              ))}
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
                <td className="py-2 pr-3">{fmtPct(player.avgHpBeforeDeath)}</td>
                <td className="py-2 pr-3">{fmtPct(player.defensiveUseRate)}</td>
                <td className="py-2 pr-3">
                  {player.topCauses.length > 0 ? player.topCauses.map((c) => `${c.ability}(${c.count})`).join(", ") : "-"}
                </td>
                <td className="py-2 pr-3">{player.notes.join(" / ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>

      {/* 사망 누적 그래프 */}
      <SectionCard title="📉 언제부터 죽기 시작했는지 (사망 누적 그래프)">
        <TimelineChart
          data={summary.deathTimeline}
          lines={[
            { dataKey: "cumulativeDeaths", name: "누적 사망", stroke: "#F87171", strokeWidth: 3 },
            { dataKey: "deaths", name: "해당 초 사망", stroke: "#FBBF24" },
          ]}
        />
      </SectionCard>

      {/* 보스 스킬 vs 생존기 타임라인 */}
      <SectionCard title="🛡️ 보스 스킬 vs 생존기 시전 타임라인">
        <TimelineChart
          data={summary.castTimeline}
          filter={(p) => p.bossCasts > 0 || p.defensiveCasts > 0 || p.deaths > 0 || (p.sec as number) % 10 === 0}
          lines={[
            { dataKey: "bossCasts", name: "보스 스킬 수", stroke: "#EF4444" },
            { dataKey: "defensiveCasts", name: "생존기 시전 수", stroke: "#22C55E" },
            { dataKey: "deaths", name: "사망 수", stroke: "#F59E0B" },
          ]}
        />
      </SectionCard>

      {/* 먼저 죽은 인원 */}
      <SectionCard title="🚨 먼저 죽은 인원 (의미 있는 사망 기준)">
        <table className="min-w-full text-xs text-gray-300">
          <thead>
            <tr className="border-b border-gray-700">
              {["시간", "이름", "원인 스킬", "HP%", "직전 생존기"].map((h) => (
                <th key={h} className="text-left py-2 pr-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {summary.firstMeaningfulDeaths.slice(0, 10).map((d, idx) => (
              <tr key={`${d.playerName}-${d.time}-${idx}`} className="border-b border-gray-800">
                <td className="py-2 pr-3 font-mono">{d.time}</td>
                <td className="py-2 pr-3">{d.playerName}</td>
                <td className="py-2 pr-3">{d.ability}</td>
                <td className="py-2 pr-3">{fmtPct(d.hpPercentBefore)}</td>
                <td className="py-2 pr-3">{d.defensives.length > 0 ? d.defensives.join(", ") : "없음"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>

      {/* 보스 스킬별 생존기 커버 현황 */}
      <SectionCard title="🎯 보스 스킬별 생존기 커버 현황" maxH="max-h-[340px]">
        <table className="min-w-full text-xs text-gray-300">
          <thead>
            <tr className="border-b border-gray-700">
              {["시간", "보스 스킬", "커버", "근처 생존기"].map((h) => (
                <th key={h} className="text-left py-2 pr-3">{h}</th>
              ))}
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
      </SectionCard>

      {/* 공대 사망 로그 샘플 */}
      <SectionCard title="🧾 우리 공대 사망 로그 샘플">
        <table className="min-w-full text-xs text-gray-300">
          <thead>
            <tr className="border-b border-gray-700">
              {["시간", "이름", "원인 스킬", "HP%", "생존기", "근처 보스 스킬"].map((h) => (
                <th key={h} className="text-left py-2 pr-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {summary.deaths.slice(0, 12).map((d, idx) => (
              <tr key={`${d.playerName}-${d.time}-${idx}`} className="border-b border-gray-800">
                <td className="py-2 pr-3 font-mono">{d.time}</td>
                <td className="py-2 pr-3">{d.playerName}</td>
                <td className="py-2 pr-3">{d.ability}</td>
                <td className="py-2 pr-3">{fmtPct(d.hpPercentBefore)}</td>
                <td className="py-2 pr-3">{d.defensives.length > 0 ? d.defensives.join(", ") : "없음"}</td>
                <td className="py-2 pr-3">{d.nearbyBossSkills.length > 0 ? d.nearbyBossSkills.join(", ") : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>
    </>
  );
}
