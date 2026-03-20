"use client";

import { useState } from "react";
import { ClinicLogSummary, ClinicLogTarget, ClinicReportItem } from "@/app/types/clinic";

function extractReportId(raw: string): string {
  const value = raw.trim();
  if (!value) return "";
  const urlMatch = value.match(/reports\/([A-Za-z0-9]+)/i);
  if (urlMatch?.[1]) return urlMatch[1];
  const token = value.split(/[/?#\s]/)[0] || "";
  return token.replace(/[^A-Za-z0-9]/g, "");
}

function parseFightId(raw?: string): number | undefined {
  if (!raw) return undefined;
  const n = Number(raw.trim());
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : undefined;
}

async function fetchClinicSummary(target: ClinicLogTarget): Promise<ClinicLogSummary> {
  const res = await fetch("/api/logs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(target),
  });
  const data = (await res.json()) as { error?: string; summary?: ClinicLogSummary };
  if (!res.ok) throw new Error(data.error || "로그 요약을 가져오지 못했습니다.");
  return data.summary as ClinicLogSummary;
}

function parseClinicTargets(
  input: string,
  throughputStepSec: number
): Array<{ key: string; label: string; target: ClinicLogTarget }> {
  const lines = input.split(/\n|,/).map((l) => l.trim()).filter(Boolean);
  const unique = new Map<string, { key: string; label: string; target: ClinicLogTarget }>();

  lines.forEach((line) => {
    const isUrlInput = /reports\//i.test(line);
    const [reportRaw, fightRaw] = isUrlInput ? [line, undefined] : line.split(/[:#]/);
    const reportId = extractReportId(reportRaw || "");
    if (!reportId) return;

    const fightIdFromUrl = isUrlInput
      ? (() => { const m = line.match(/[?&#]fight=(\d+)/i); return m?.[1] ? parseFightId(m[1]) : undefined; })()
      : undefined;
    const fightId = fightIdFromUrl ?? parseFightId(fightRaw);
    const key = `${reportId}-${fightId ?? "auto"}`;

    unique.set(key, {
      key,
      label: fightId ? `${reportId}:${fightId}` : reportId,
      target: { reportId, ...(fightId ? { fightId } : {}), preferKill: false, throughputStepSec },
    });
  });

  return Array.from(unique.values());
}

async function fetchAiAnalysis(summary: ClinicLogSummary): Promise<string> {
  const res = await fetch("/api/ai/log-analysis", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ failedLog: summary }),
  });
  const data = (await res.json()) as { error?: string; analysis?: string };
  if (!res.ok) throw new Error(data.error || "AI 분석에 실패했습니다.");
  return data.analysis || "분석 결과가 비어 있습니다.";
}

export function useClinicState() {
  const [failedLogsInput, setFailedLogsInput] = useState("");
  const [clinicSampleStepSec, setClinicSampleStepSec] = useState<number>(2);
  const [analysisError, setAnalysisError] = useState("");
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);
  const [clinicReports, setClinicReports] = useState<ClinicReportItem[]>([]);

  const analyzeLogs = async () => {
    setIsAnalysisLoading(true);
    setAnalysisError("");
    setClinicReports([]);

    try {
      const targets = parseClinicTargets(failedLogsInput, clinicSampleStepSec);
      if (targets.length === 0) {
        throw new Error("실패 로그를 1개 이상 입력해 주세요. (reportId 또는 reportId:fightId)");
      }
      const nextReports: ClinicReportItem[] = [];
      for (const entry of targets) {
        const summary = await fetchClinicSummary(entry.target);
        const analysis = await fetchAiAnalysis(summary);
        nextReports.push({ key: entry.key, label: entry.label, summary, analysis });
      }
      setClinicReports(nextReports);
    } catch (error: unknown) {
      setAnalysisError(error instanceof Error ? error.message : "공대 AI 분석 중 오류가 발생했습니다.");
    } finally {
      setIsAnalysisLoading(false);
    }
  };

  return {
    failedLogsInput, setFailedLogsInput,
    clinicSampleStepSec, setClinicSampleStepSec,
    analysisError,
    isAnalysisLoading,
    clinicReports,
    analyzeLogs,
  };
}
