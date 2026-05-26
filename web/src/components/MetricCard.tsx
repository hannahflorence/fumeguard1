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
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
        {value}
        <span className="ml-1 text-lg font-normal text-slate-500">{unit}</span>
      </p>
      {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}
