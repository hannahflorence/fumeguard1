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
import type { HistoryPoint } from "../hooks/useRealtimeData";
import { Card } from "./Card";

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

const tooltipStyle = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  boxShadow: "0 4px 15px rgba(0, 0, 0, 0.1)",
  fontSize: 12,
};

export function TrendCharts({ history }: { history: HistoryPoint[] }) {
  const chartData = history.map((h) => ({
    time: formatTime(h.ts),
    gas: h.gasPpm,
    dust: h.dustUgM3,
    cei: h.cei,
  }));

  if (chartData.length === 0) {
    return (
      <Card className="p-8 text-center font-semibold tracking-wide text-slate-700">
        Waiting for sensor history...
      </Card>
    );
  }

  return (
    <Card className="p-4 sm:p-5">
      <h3 className="mb-4 text-lg font-bold tracking-tight text-slate-950">
        Real-Time Trends
      </h3>
      <div className="h-[220px] w-full sm:h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="2 4" stroke="#e2e8f0" opacity={0.8} />
            <XAxis dataKey="time" stroke="#475569" tick={{ fontSize: 11 }} minTickGap={24} />
            <YAxis stroke="#475569" tick={{ fontSize: 11 }} width={44} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend verticalAlign="top" height={30} iconType="circle" />
            <Line
              type="monotone"
              dataKey="gas"
              name="Gas (ADC)"
              stroke="#0284c7"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="dust"
              name="Dust (ADC)"
              stroke="#7c3aed"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="cei"
              name="CEI Score"
              stroke="#ea580c"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
