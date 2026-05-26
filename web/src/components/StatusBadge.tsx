import type { AirStatus } from "@fumeguard/shared";

const styles: Record<AirStatus, string> = {
  safe: "bg-emerald-100 text-emerald-700 border-emerald-200",
  warning: "bg-amber-100 text-amber-700 border-amber-200",
  hazardous: "bg-red-100 text-red-700 border-red-200",
};

const labels: Record<AirStatus, string> = {
  safe: "Safe",
  warning: "Warning",
  hazardous: "Hazardous",
};

export function StatusBadge({ status }: { status: AirStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-bold uppercase tracking-wide ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}
