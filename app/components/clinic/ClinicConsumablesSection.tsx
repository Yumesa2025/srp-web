"use client";

import { ClinicLogSummary } from "@/app/types/clinic";
import { sharedClasses } from "@/app/styles/sharedClasses";

const getStyles = () => ({
  timelineContainer: "rounded-lg border p-3",
  timelineTitle: "text-xs font-bold mb-2",
  tableWrapper: sharedClasses.table.wrapper + " max-h-[220px]",
  table: sharedClasses.table.root,
  trHead: sharedClasses.table.th,
  th: "text-left py-1 pr-2",
  trBody: sharedClasses.table.tr,
  td: sharedClasses.table.td,
  tdMono: sharedClasses.table.td + " font-mono",
  tdEmpty: "py-2 text-gray-500",

  sectionContainer: "mt-6 p-5 bg-gray-900 rounded-xl border border-gray-700",
  sectionTitle: "text-sm text-gray-300 mb-3 font-bold",
  textGray400: "text-[11px] text-gray-400 mb-3",
  textGray400Mb2: "text-[11px] text-gray-400 mb-2",
  overrideValue: "ml-1 font-mono text-cyan-300",
  textGray500: "text-[11px] text-gray-500 mb-3",
  envCode: "font-mono",

  insightsTableWrapper: sharedClasses.table.wrapper + " max-h-[180px] mb-4",
  insightsTable: sharedClasses.table.root,
  insightsTh: "text-left py-1 pr-3",
  insightsTd: "py-1 pr-3",
  insightsTdMono: "py-1 pr-3 font-mono",
  
  unclassified: "text-[11px] text-amber-300 mb-3",
  gridContainer: "grid grid-cols-1 md:grid-cols-3 gap-3",
});

interface ConsumableTimelineTableProps {
  title: string;
  borderClassName: string;
  bgClassName: string;
  textClassName: string;
  emptyText: string;
  rows: ClinicLogSummary["consumables"]["timeline"];
  rowKeyPrefix: string;
}

function ConsumableTimelineTable({
  title,
  borderClassName,
  bgClassName,
  textClassName,
  emptyText,
  rows,
  rowKeyPrefix,
}: ConsumableTimelineTableProps) {
  const styles = getStyles();
  return (
    <div className={`${styles.timelineContainer} ${borderClassName} ${bgClassName}`}>
      <div className={`${styles.timelineTitle} ${textClassName}`}>{title}</div>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr className={styles.trHead}>
              <th className={styles.th}>시간</th>
              <th className={styles.th}>플레이어</th>
              <th className={styles.th}>이름</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 30).map((item, idx) => (
              <tr key={`${rowKeyPrefix}-${item.timeSec}-${item.playerName}-${idx}`} className={styles.trBody}>
                <td className={styles.tdMono}>{item.time}</td>
                <td className={styles.td}>{item.playerName}</td>
                <td className={styles.td}>{item.ability}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className={styles.tdEmpty} colSpan={3}>
                  {emptyText}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface ClinicConsumablesSectionProps {
  summary: ClinicLogSummary;
}

export default function ClinicConsumablesSection({ summary }: ClinicConsumablesSectionProps) {
  const styles = getStyles();
  
  const healthstoneTimeline = summary.consumables.timeline.filter((item) => item.type === "HEALTHSTONE");
  const healingPotionTimeline = summary.consumables.timeline.filter((item) => item.type === "HEALING_POTION");
  const dpsPotionTimeline = summary.consumables.timeline.filter((item) => item.type === "DPS_POTION");

  return (
    <div className={styles.sectionContainer}>
      <div className={styles.sectionTitle}>🧪 소모품 사용 타임라인 (생석/치유물약/딜물약)</div>
      <div className={styles.textGray400}>
        생석 미사용: {summary.consumables.missing.healthstone.slice(0, 12).join(", ") || "-"} | 치유물약 미사용:{" "}
        {summary.consumables.missing.healingPotion.slice(0, 12).join(", ") || "-"} | 딜물약 미사용:{" "}
        {summary.consumables.missing.dpsPotion.slice(0, 12).join(", ") || "-"}
      </div>
      <div className={styles.textGray400Mb2}>
        추천 오버라이드:
        <span className={styles.overrideValue}>
          {summary.consumables.recommendedOverrides || "(추가 후보 없음)"}
        </span>
      </div>
      <div className={styles.textGray500}>
        `.env.local` 예시:{" "}
        <span className={styles.envCode}>
          WCL_CONSUMABLE_SPELL_OVERRIDES={summary.consumables.recommendedOverrides || "6262:HEALTHSTONE"}
        </span>
      </div>
      
      {summary.consumables.spellIdInsights.length > 0 && (
        <div className={styles.insightsTableWrapper}>
          <table className={styles.insightsTable}>
            <thead>
              <tr className={styles.trHead}>
                <th className={styles.insightsTh}>Spell ID</th>
                <th className={styles.insightsTh}>이름</th>
                <th className={styles.insightsTh}>분류</th>
                <th className={styles.insightsTh}>근거</th>
                <th className={styles.insightsTh}>횟수</th>
              </tr>
            </thead>
            <tbody>
              {summary.consumables.spellIdInsights.slice(0, 20).map((row) => (
                <tr key={`${row.spellId}-${row.inferredType}`} className={styles.trBody}>
                  <td className={styles.insightsTdMono}>{row.spellId}</td>
                  <td className={styles.insightsTd}>{row.ability}</td>
                  <td className={styles.insightsTd}>{row.inferredType}</td>
                  <td className={styles.insightsTd}>{row.source}</td>
                  <td className={styles.insightsTd}>{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {summary.consumables.unclassifiedCandidates.length > 0 && (
        <div className={styles.unclassified}>
          미분류 후보:{" "}
          {summary.consumables.unclassifiedCandidates
            .slice(0, 8)
            .map((c) => `${c.spellId ?? "?"}:${c.ability}(${c.count})`)
            .join(", ")}
        </div>
      )}
      
      <div className={styles.gridContainer}>
        <ConsumableTimelineTable
          title="생석 타임라인"
          borderClassName="border-indigo-800/70"
          bgClassName="bg-indigo-950/15"
          textClassName="text-indigo-300"
          emptyText="사용 기록 없음"
          rows={healthstoneTimeline}
          rowKeyPrefix="hs"
        />
        <ConsumableTimelineTable
          title="치유물약 타임라인"
          borderClassName="border-emerald-800/70"
          bgClassName="bg-emerald-950/15"
          textClassName="text-emerald-300"
          emptyText="사용 기록 없음"
          rows={healingPotionTimeline}
          rowKeyPrefix="heal-pot"
        />
        <ConsumableTimelineTable
          title="딜물약 타임라인"
          borderClassName="border-sky-800/70"
          bgClassName="bg-sky-950/15"
          textClassName="text-sky-300"
          emptyText="사용 기록 없음"
          rows={dpsPotionTimeline}
          rowKeyPrefix="dps-pot"
        />
      </div>
    </div>
  );
}
