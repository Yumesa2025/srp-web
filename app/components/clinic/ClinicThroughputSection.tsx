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

interface ClinicThroughputSectionProps {
  summary: ClinicLogSummary;
}

export default function ClinicThroughputSection({ summary }: ClinicThroughputSectionProps) {
  return (
    <>
      <div className="mt-6 p-5 bg-gray-900 rounded-xl border border-gray-700">
        <div className="text-sm text-gray-300 mb-3 font-bold">📈 공대 DPS (시간별, {summary.throughputStepSec}초 구간)</div>
        <div className="h-[240px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={summary.throughputTimeline} margin={{ top: 12, right: 24, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="time" stroke="#9CA3AF" minTickGap={22} />
              <YAxis stroke="#9CA3AF" />
              <Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151" }} labelStyle={{ color: "#D1D5DB" }} />
              <Legend />
              <Line type="monotone" dataKey="dps" name="Raid DPS" stroke="#F97316" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-6 p-5 bg-gray-900 rounded-xl border border-gray-700">
        <div className="text-sm text-gray-300 mb-3 font-bold">💚 공대 HPS (시간별, {summary.throughputStepSec}초 구간)</div>
        <div className="h-[240px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={summary.throughputTimeline} margin={{ top: 12, right: 24, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="time" stroke="#9CA3AF" minTickGap={22} />
              <YAxis stroke="#9CA3AF" />
              <Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151" }} labelStyle={{ color: "#D1D5DB" }} />
              <Legend />
              <Line type="monotone" dataKey="hps" name="Raid HPS" stroke="#22C55E" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}
