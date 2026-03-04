"use client";

import ClinicReportCard from "@/app/components/clinic/ClinicReportCard";
import { ClinicReportItem } from "@/app/types/clinic";

interface ClinicAnalysisTabProps {
  failedLogsInput: string;
  onFailedLogsInputChange: (value: string) => void;
  clinicSampleStepSec: number;
  onClinicSampleStepSecChange: (value: number) => void;
  onAnalyze: () => void;
  isAnalysisLoading: boolean;
  analysisError: string;
  clinicReports: ClinicReportItem[];
}

export default function ClinicAnalysisTab({
  failedLogsInput,
  onFailedLogsInputChange,
  clinicSampleStepSec,
  onClinicSampleStepSecChange,
  onAnalyze,
  isAnalysisLoading,
  analysisError,
  clinicReports,
}: ClinicAnalysisTabProps) {
  return (
    <div className="mb-8 p-8 bg-gray-800 rounded-2xl border-2 border-red-500/30 shadow-2xl">
      <h2 className="text-2xl font-bold text-red-400 mb-6 flex items-center gap-2">🏥 공대 클리닉: 사망 원인 분석</h2>

      <p className="text-sm text-gray-400 mb-6">
        실패 로그를 1개 넣으면 1개 분석, 여러 개 넣으면 각각 개별 분석합니다. 우선순위는 생석/치유물약/딜물약 사용 타이밍, 사망
        시작 구간, 보스 스킬 대비 생존기 커버, 공대 DPS/HPS 시간 추이입니다.
      </p>

      <div className="grid grid-cols-1 gap-6 mb-6">
        <div className="p-4 bg-gray-900 rounded-lg border border-red-900/50">
          <label className="block text-red-400 text-sm mb-2 font-bold">❌ 실패 로그 (우리 공대)</label>
          <textarea
            placeholder={`한 줄에 하나씩 입력\n형식: reportId 또는 reportId:fightId\nURL 가능 (fight 파라미터 자동 인식)\n예시)\nABC123DEF456\nXYZ789QWE654:12\nhttps://www.warcraftlogs.com/reports/LMN456AAA111?fight=7`}
            value={failedLogsInput}
            onChange={(e) => onFailedLogsInputChange(e.target.value)}
            rows={5}
            className="w-full p-3 bg-gray-800 border border-gray-700 rounded text-white resize-none"
          />
          <div className="mt-3 flex items-center gap-2">
            <label className="text-xs text-gray-400">그래프 샘플링</label>
            <select
              value={clinicSampleStepSec}
              onChange={(e) => onClinicSampleStepSecChange(Number(e.target.value))}
              className="px-2 py-1 text-xs bg-gray-800 border border-gray-700 rounded text-white"
            >
              <option value={1}>1초</option>
              <option value={2}>2초</option>
              <option value={5}>5초</option>
              <option value={10}>10초</option>
            </select>
            <span className="text-[11px] text-gray-500">DPS/HPS 구간 평균 표시</span>
          </div>
        </div>
      </div>

      <button
        onClick={onAnalyze}
        disabled={isAnalysisLoading}
        className="w-full py-4 bg-linear-to-r from-red-600 to-blue-600 disabled:from-gray-700 disabled:to-gray-700 rounded-xl font-bold text-xl hover:from-red-500 hover:to-blue-500 transition-all shadow-lg"
      >
        {isAnalysisLoading ? "분석 중..." : "🔍 AI 집중 분석 시작"}
      </button>

      {analysisError && (
        <div className="mt-4 p-4 rounded-lg border border-red-700 bg-red-950/30 text-red-300 text-sm">{analysisError}</div>
      )}

      {clinicReports.map((report, reportIndex) => (
        <ClinicReportCard key={report.key} report={report} reportIndex={reportIndex} />
      ))}
    </div>
  );
}
