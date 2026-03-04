"use client";

import { ClinicReportItem } from "@/app/types/clinic";
import ClinicConsumablesSection from "@/app/components/clinic/ClinicConsumablesSection";
import ClinicDeepAnalysisSection from "@/app/components/clinic/ClinicDeepAnalysisSection";
import ClinicOverviewSection from "@/app/components/clinic/ClinicOverviewSection";
import ClinicThroughputSection from "@/app/components/clinic/ClinicThroughputSection";

interface ClinicReportCardProps {
  report: ClinicReportItem;
  reportIndex: number;
}

const formatDurationSec = (durationSec: number) => {
  const sec = Math.max(0, Math.floor(durationSec));
  const m = Math.floor(sec / 60)
    .toString()
    .padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};

export default function ClinicReportCard({ report, reportIndex }: ClinicReportCardProps) {
  const failedSummary = report.summary;

  return (
    <div className="mt-8 p-6 rounded-xl border border-gray-700 bg-gray-900/40">
      <div className="text-sm text-gray-400 mb-4">
        분석 대상 #{reportIndex + 1}: <span className="text-gray-200 font-mono">{report.label}</span> |{" "}
        <span className="text-gray-300">{failedSummary.fight.name}</span>
      </div>
      <ClinicOverviewSection summary={failedSummary} formatDurationSec={formatDurationSec} />
      <ClinicThroughputSection summary={failedSummary} />
      <ClinicConsumablesSection summary={failedSummary} />
      <ClinicDeepAnalysisSection summary={failedSummary} />

      {report.analysis && (
        <div className="mt-8 p-6 bg-gray-900 rounded-xl border border-gray-700 whitespace-pre-wrap leading-relaxed">
          {report.analysis}
        </div>
      )}
    </div>
  );
}
