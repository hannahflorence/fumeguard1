import type { AirStatus, LatestReading } from "@fumeguard/shared";

const statusStyles: Record<
  AirStatus,
  { active: string; idle: string }
> = {
  safe: {
    active: "border-emerald-500 bg-emerald-500 text-white shadow-[0_2px_10px_rgba(16,185,129,0.35)]",
    idle: "border-slate-200 bg-white text-slate-500",
  },
  warning: {
    active: "border-amber-500 bg-amber-500 text-white shadow-[0_2px_10px_rgba(245,158,11,0.35)]",
    idle: "border-slate-200 bg-white text-slate-500",
  },
  hazardous: {
    active: "border-red-500 bg-red-500 text-white shadow-[0_2px_10px_rgba(239,68,68,0.35)]",
    idle: "border-slate-200 bg-white text-slate-500",
  },
};

const fanStyles = {
  on: "border-sky-500 bg-sky-500 text-white shadow-[0_2px_10px_rgba(14,165,233,0.35)]",
  off: "border-slate-200 bg-white text-slate-500",
};

const statusLabels: Record<AirStatus, string> = {
  safe: "Safe",
  warning: "Warning",
  hazardous: "Hazardous",
};

const statusOrder: AirStatus[] = ["safe", "warning", "hazardous"];

export function SystemStatus({ latest }: { latest: LatestReading | null }) {
  const current = latest?.status;
  const unknown = !latest;
  const fanOn = latest?.fanOn ?? false;

  return (
    <div className="inline-grid w-full grid-cols-4 gap-1.5">
      {statusOrder.map((status) => (
        <StatusIndicator
          key={status}
          label={statusLabels[status]}
          active={!unknown && current === status}
          className={
            !unknown && current === status
              ? statusStyles[status].active
              : statusStyles[status].idle
          }
          unknown={unknown}
        />
      ))}
      <FanIndicator on={fanOn} unknown={unknown} />
    </div>
  );
}

function StatusIndicator({
  label,
  active,
  className,
  unknown,
}: {
  label: string;
  active: boolean;
  className: string;
  unknown: boolean;
}) {
  return (
    <div
      className={`card-highlight-sm flex flex-col items-center justify-center rounded-lg border px-1.5 py-2 text-center transition-colors ${className} ${
        unknown ? "opacity-60" : ""
      } ${active ? "font-bold" : "font-semibold"}`}
      aria-current={active ? "true" : undefined}
    >
      <span className="text-[10px] leading-tight sm:text-xs">{label}</span>
    </div>
  );
}

function FanIndicator({ on, unknown }: { on: boolean; unknown: boolean }) {
  const active = !unknown && on;
  const className = unknown ? fanStyles.off : on ? fanStyles.on : fanStyles.off;

  return (
    <div
      className={`card-highlight-sm flex flex-col items-center justify-center gap-1 rounded-lg border px-1.5 py-2 text-center transition-colors ${className} ${
        unknown ? "opacity-60" : ""
      } ${active ? "font-bold" : "font-semibold"}`}
    >
      <span className="text-[10px] leading-tight sm:text-xs">Exhaust fan</span>
      <span
        className={`rounded-full px-2 py-0.5 text-[10px] font-bold leading-none sm:text-xs ${
          unknown
            ? "bg-slate-200 text-slate-600"
            : on
              ? "bg-white/25 text-white"
              : "bg-slate-200 text-slate-700"
        }`}
      >
        {unknown ? "—" : on ? "ON" : "OFF"}
      </span>
    </div>
  );
}
