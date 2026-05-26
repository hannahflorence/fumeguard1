import { cardClassName } from "./Card";

interface MetricCardProps {
  label: string;
  value: string;
  unit: string;
  sub?: string;
  className?: string;
}

export function MetricCard({ label, value, unit, sub, className }: MetricCardProps) {
  return (
    <div className={`${cardClassName} p-5 ${className ?? ""}`}>
      <p className="text-sm font-semibold text-slate-700">{label}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
        {value}
        <span className="ml-1 text-lg font-semibold text-slate-600">{unit}</span>
      </p>
      {sub && <p className="mt-1 text-xs font-medium text-slate-600">{sub}</p>}
    </div>
  );
}
