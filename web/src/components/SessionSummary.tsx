import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SessionRecord } from "@fumeguard/shared";
import { Card } from "./Card";

const tooltipStyle = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  boxShadow: "0 4px 15px rgba(0, 0, 0, 0.1)",
};

export function SessionSummary({
  sessions,
  loading,
}: {
  sessions: SessionRecord[];
  loading: boolean;
}) {
  const recent = sessions.slice(0, 8).reverse();
  const chartData = recent.map((s) => ({
    name: new Date(s.startedAt).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    cei: Math.round(s.finalCei * 10) / 10,
    peakGas: s.peakGasPpm,
  }));

  if (loading) {
    return <div className="font-medium text-slate-700">Loading sessions…</div>;
  }

  if (chartData.length === 0) {
    return (
      <Card className="p-6 font-medium text-slate-700">
        No completed sessions yet. Start soldering to record exposure.
      </Card>
    );
  }

  return (
    <Card className="p-4 sm:p-5">
      <h3 className="mb-4 text-lg font-bold text-slate-950">Session exposure (CEI)</h3>
      <div className="h-[200px] w-full sm:h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <XAxis
              dataKey="name"
              stroke="#64748b"
              tick={{ fontSize: 10 }}
              interval={0}
              angle={-20}
              textAnchor="end"
              height={60}
            />
            <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="cei" name="Final CEI" fill="#ea580c" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
