import type { LatestReading } from "@fumeguard/shared";

export function SystemStatus({ latest }: { latest: LatestReading | null }) {
  const status = latest?.status;

  return (
    <div className="flex flex-wrap gap-2">
      <Actuator label="Exhaust fan" on={latest?.fanOn ?? false} unknown={!latest} />
      <Actuator
        label="Green LED"
        on={status === "safe"}
        unknown={!latest}
        activeClass="bg-emerald-500/20 text-emerald-400"
      />
      <Actuator
        label="Yellow LED"
        on={status === "warning"}
        unknown={!latest}
        activeClass="bg-amber-500/20 text-amber-400"
      />
      <Actuator
        label="Red LED"
        on={status === "hazardous"}
        unknown={!latest}
        activeClass="bg-red-500/20 text-red-400"
      />
    </div>
  );
}

function Actuator({
  label,
  on,
  unknown,
  activeClass = "bg-emerald-500/20 text-emerald-400",
}: {
  label: string;
  on: boolean;
  unknown?: boolean;
  activeClass?: string;
}) {
  return (
    <div className="flex min-w-[7.5rem] items-center justify-between gap-2 rounded-lg border border-slate-700/80 bg-slate-800/50 px-3 py-2">
      <span className="text-xs text-slate-300">{label}</span>
      <span
        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
          unknown ? "bg-slate-700 text-slate-400" : on ? activeClass : "bg-slate-700 text-slate-400"
        }`}
      >
        {unknown ? "—" : on ? "ON" : "OFF"}
      </span>
    </div>
  );
}
