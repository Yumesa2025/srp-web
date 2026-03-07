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

interface ThroughputChartProps {
  data: ClinicLogSummary["throughputTimeline"];
  dataKey: string;
  name: string;
  color: string;
  title: string;
}

function ThroughputChart({ data, dataKey, name, color, title }: ThroughputChartProps) {
  return (
    <div className="mt-6 p-5 bg-gray-900 rounded-xl border border-gray-700">
      <div className="text-sm text-gray-300 mb-3 font-bold">{title}</div>
      <div className="h-[240px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 12, right: 24, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="time" stroke="#9CA3AF" minTickGap={22} />
            <YAxis stroke="#9CA3AF" />
            <Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #374151" }} labelStyle={{ color: "#D1D5DB" }} />
            <Legend />
            <Line type="monotone" dataKey={dataKey} name={name} stroke={color} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

interface ClinicThroughputSectionProps {
  summary: ClinicLogSummary;
}

export default function ClinicThroughputSection({ summary }: ClinicThroughputSectionProps) {
  return (
    <>
      <ThroughputChart
        data={summary.throughputTimeline}
        dataKey="dps"
        name="Raid DPS"
        color="#F97316"
        title={`📈 공대 DPS (시간별, ${summary.throughputStepSec}초 구간)`}
      />
      <ThroughputChart
        data={summary.throughputTimeline}
        dataKey="hps"
        name="Raid HPS"
        color="#22C55E"
        title={`💚 공대 HPS (시간별, ${summary.throughputStepSec}초 구간)`}
      />
    </>
  );
}
