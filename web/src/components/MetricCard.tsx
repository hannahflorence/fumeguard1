import { cardClassName } from "./Card";

interface MetricCardProps {
  label: string;
  value: string;
  unit: string;
  sub?: string;
  className?: string;
  tone?: "neutral" | "safe" | "warning" | "hazardous";
}

const toneClass: Record<NonNullable<MetricCardProps["tone"]>, string> = {
  neutral: "",
  safe: "border-emerald-200 ring-1 ring-emerald-100",
  warning: "border-amber-200 ring-1 ring-amber-100",
  hazardous: "border-red-200 ring-1 ring-red-100",
};

export function MetricCard({
  label,
  value,
  unit,
  sub,
  className,
  tone = "neutral",
}: MetricCardProps) {
  return (
    <div className={`${cardClassName} p-5 ${toneClass[tone]} ${className ?? ""}`}>
      <p className="text-sm font-semibold tracking-wide text-slate-700">{label}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
        {value}
        <span className="ml-1 text-lg font-semibold uppercase text-slate-600">{unit}</span>
      </p>
      {sub && (
        <p className="mt-1 text-xs font-medium tracking-wide text-slate-600">{sub}</p>
      )}
    </div>
  );
}
