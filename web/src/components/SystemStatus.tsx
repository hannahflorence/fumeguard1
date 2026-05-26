import type { LatestReading } from "@fumeguard/shared";

export function SystemStatus({ latest }: { latest: LatestReading | null }) {
  const status = latest?.status;

  return (
    <div className="grid grid-cols-1 gap-2 min-[480px]:grid-cols-2 sm:flex sm:flex-wrap">
      <Actuator label="Exhaust fan" on={latest?.fanOn ?? false} unknown={!latest} />
      <Actuator
        label="Green LED"
        on={status === "safe"}
        unknown={!latest}
        activeClass="bg-emerald-100 text-emerald-700"
      />
      <Actuator
        label="Yellow LED"
        on={status === "warning"}
        unknown={!latest}
        activeClass="bg-amber-100 text-amber-700"
      />
      <Actuator
        label="Red LED"
        on={status === "hazardous"}
        unknown={!latest}
        activeClass="bg-red-100 text-red-700"
      />
    </div>
  );
}

function Actuator({
  label,
  on,
  unknown,
  activeClass = "bg-emerald-100 text-emerald-700",
}: {
  label: string;
  on: boolean;
  unknown?: boolean;
  activeClass?: string;
}) {
  return (
    <div className="card-highlight-sm flex min-w-0 items-center justify-between gap-2 px-3 py-2 sm:min-w-[7.5rem]">
      <span className="text-xs text-slate-600">{label}</span>
      <span
        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
          unknown ? "bg-slate-200 text-slate-500" : on ? activeClass : "bg-slate-200 text-slate-500"
        }`}
      >
        {unknown ? "—" : on ? "ON" : "OFF"}
      </span>
    </div>
  );
}
