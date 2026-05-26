import { Card } from "./Card";
import { PAIRED_PANEL_BODY_CLASS, PanelFooter } from "./PanelFooter";
import type { HardwareHealthState } from "../hooks/useHardwareHealth";

const components: { key: keyof Pick<
  HardwareHealthState,
  "esp32Online" | "gasSensorOnline" | "dustSensorOnline"
>; label: string }[] = [
  { key: "esp32Online", label: "ESP32 Microcontroller" },
  { key: "gasSensorOnline", label: "Gas Sensor" },
  { key: "dustSensorOnline", label: "Dust Particle Sensor" },
];

export function HardwareHealth({ health }: { health: HardwareHealthState }) {
  return (
    <Card className="flex h-full flex-col">
      <h3 className="shrink-0 border-b border-slate-100 p-4 text-lg font-bold uppercase tracking-wide text-slate-950">
        Hardware Health
      </h3>
      <ul className={`${PAIRED_PANEL_BODY_CLASS} justify-center gap-3 p-4`}>
        {components.map(({ key, label }) => (
          <HealthRow key={key} label={label} online={health[key]} />
        ))}
      </ul>
      <PanelFooter />
    </Card>
  );
}

function HealthRow({ label, online }: { label: string; online: boolean }) {
  return (
    <li className="flex shrink-0 items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2.5">
      <span className="text-sm font-bold uppercase tracking-wide text-slate-800">
        {label}
      </span>
      <span
        className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide ${
          online
            ? "bg-emerald-100 text-emerald-700"
            : "bg-slate-200 text-slate-600"
        }`}
      >
        {online ? "Online" : "Offline"}
      </span>
    </li>
  );
}
