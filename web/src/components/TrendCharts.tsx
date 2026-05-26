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
      <Card className="p-8 text-center text-slate-500">
        Waiting for sensor history…
      </Card>
    );
  }

  return (
    <Card className="p-4 sm:p-5">
      <h3 className="mb-4 text-lg font-semibold text-slate-900">Real-time trends</h3>
      <div className="h-[220px] w-full sm:h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 11 }} />
            <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend />
            <Line type="monotone" dataKey="gas" name="Gas (ppm)" stroke="#0284c7" dot={false} />
            <Line type="monotone" dataKey="dust" name="Dust (µg/m³)" stroke="#7c3aed" dot={false} />
            <Line type="monotone" dataKey="cei" name="CEI" stroke="#ea580c" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
