import { useMemo, useState } from "react";
import { Card } from "../components/Card";
import { HardwareHealth } from "../components/HardwareHealth";
import { HistoryTable } from "../components/HistoryTable";
import { MetricCard } from "../components/MetricCard";
import { Pagination, paginate, totalPages } from "../components/Pagination";
import { SystemStatus } from "../components/SystemStatus";
import { TrendCharts } from "../components/TrendCharts";
import {
  useFilteredHistory,
  useHistory,
  useLatest,
} from "../hooks/useRealtimeData";
import { useHardwareHealth } from "../hooks/useHardwareHealth";
import { useBridgeHealth } from "../hooks/useBridgeHealth";
import { DEVICE_ID } from "../lib/firebase";

const TELEMETRY_STALE_MS = 90_000;
const DELAYED_TELEMETRY_MS = 180_000;

function formatAge(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  if (totalSeconds < 60) return `${totalSeconds}s ago`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s ago`;
}

export function Dashboard() {
  const { data: latest, loading, error } = useLatest();
  const { data: history, loading: historyLoading } = useHistory(80);
  const bridgeHealth = useBridgeHealth();
  const hardwareHealth = useHardwareHealth(latest, loading, error);

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [historyPage, setHistoryPage] = useState(1);

  const fromTs = dateFrom ? new Date(dateFrom).getTime() : null;
  const toTs = dateTo ? new Date(dateTo).getTime() + 86400000 - 1 : null;
  const filteredHistory = useFilteredHistory(history, fromTs, toTs);
  const historyNewestFirst = useMemo(
    () => [...filteredHistory].reverse(),
    [filteredHistory]
  );

  const historyPages = totalPages(historyNewestFirst.length);
  const pagedHistory = paginate(historyNewestFirst, historyPage);
  const now = Date.now();
  const latestAgeMs = latest ? Math.abs(now - latest.ts) : Number.POSITIVE_INFINITY;
  const hasFreshTelemetry = latest != null && latestAgeMs <= TELEMETRY_STALE_MS;
  const lastSeenText =
    latest != null ? new Date(latest.ts).toLocaleString() : "No telemetry received yet";
  const visibleLatest = hasFreshTelemetry ? latest : null;
  const freshnessState = !latest
    ? "offline"
    : latestAgeMs <= TELEMETRY_STALE_MS
      ? "live"
      : latestAgeMs <= DELAYED_TELEMETRY_MS
        ? "delayed"
        : "offline";
  const freshnessLabel =
    freshnessState === "live"
      ? "Live"
      : freshnessState === "delayed"
        ? "Delayed"
        : "Offline";
  const freshnessClass =
    freshnessState === "live"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : freshnessState === "delayed"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-slate-200 bg-slate-100 text-slate-600";
  const statusTone =
    visibleLatest?.status === "safe"
      ? "safe"
      : visibleLatest?.status === "warning"
        ? "warning"
        : visibleLatest?.status === "hazardous"
          ? "hazardous"
          : "neutral";

  return (
    <div className="dashboard-ui mx-auto max-w-7xl space-y-6 px-4 py-6 sm:space-y-8 sm:px-6 sm:py-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
              Fume Monitoring System
            </h1>
            <span
              className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold tracking-wide ${freshnessClass}`}
            >
              {freshnessLabel}
            </span>
          </div>
          <p className="mt-1 text-sm font-semibold tracking-wide text-slate-700 sm:text-base">
            Device{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 font-semibold normal-case text-sky-700">
              {DEVICE_ID}
            </code>
          </p>
        </div>

        <Card className="w-full shrink-0 p-3 sm:w-auto">
          <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-900">
            System Actuators
          </h3>
          <SystemStatus latest={visibleLatest} />
        </Card>
      </header>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
          <p className="font-semibold text-slate-600">ESP32 Link</p>
          <p className={`font-bold ${hardwareHealth.esp32Online ? "text-emerald-700" : "text-slate-500"}`}>
            {hardwareHealth.esp32Online ? "Connected" : "Disconnected"}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
          <p className="font-semibold text-slate-600">MQTT Bridge</p>
          <p
            className={`font-bold ${
              !bridgeHealth.enabled
                ? hasFreshTelemetry
                  ? "text-emerald-700"
                  : "text-slate-500"
                : bridgeHealth.loading
                  ? "text-slate-500"
                  : bridgeHealth.mqttConnected
                    ? "text-emerald-700"
                    : "text-red-700"
            }`}
          >
            {!bridgeHealth.enabled
              ? hasFreshTelemetry
                ? "Active"
                : "Cloud hosted"
              : bridgeHealth.loading
                ? "Checking..."
                : bridgeHealth.mqttConnected
                  ? "Connected"
                  : bridgeHealth.error
                    ? "Server offline"
                    : "Disconnected"}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
          <p className="font-semibold text-slate-600">Firebase Feed</p>
          <p className={`font-bold ${!error ? "text-emerald-700" : "text-red-700"}`}>
            {!error ? "Healthy" : "Unavailable"}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
          <p className="font-semibold text-slate-600">Last Publish</p>
          <p className="font-bold text-slate-700">{latest ? formatAge(latestAgeMs) : "No data"}</p>
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold tracking-wide text-red-700 shadow-[0_4px_15px_rgba(0,0,0,0.06)]">
          Cannot reach Firebase: {error}. Start emulators and backend bridge.
        </div>
      )}

      {loading && !latest && (
        <p className="font-semibold tracking-wide text-slate-700">
          Connecting to live data...
        </p>
      )}
      {!loading && !hasFreshTelemetry && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold tracking-wide text-amber-800 shadow-[0_4px_15px_rgba(0,0,0,0.06)]">
          {latest == null ? (
            <>
              No telemetry in Firebase yet for <code className="font-mono">{DEVICE_ID}</code>.
              Ensure emulators, <code className="font-mono">npm run dev:server</code>, and the ESP32
              are running. First publish can take up to 1 minute after boot.
            </>
          ) : (
            <>
              No fresh telemetry from device. Last seen: {lastSeenText}. Wait for the next ESP32
              publish (every 1 minute) or check Wi-Fi / MQTT on the board.
            </>
          )}
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 overflow-visible sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Gas (MQ-135)"
          value={visibleLatest ? visibleLatest.gasPpm.toFixed(0) : "—"}
          unit="ADC"
          tone={statusTone}
        />
        <MetricCard
          label="Dust Sensor"
          value={visibleLatest ? visibleLatest.dustUgM3.toFixed(0) : "—"}
          unit="ADC"
          tone={statusTone}
        />
        <MetricCard
          label="CEI Score"
          value={visibleLatest ? visibleLatest.cei.toFixed(1) : "—"}
          unit="/ 100"
          sub="Higher Is Cleaner Air"
          tone={statusTone}
        />
        <MetricCard
          label="Exposure Load"
          value={visibleLatest?.load != null ? (visibleLatest.load * 100).toFixed(0) : "—"}
          unit="%"
          sub="Of Hazard Threshold"
          tone={statusTone}
        />
      </section>

      <section className="grid grid-cols-1 items-stretch gap-6 overflow-visible lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <div>
          <TrendCharts history={historyLoading ? [] : history} />
        </div>
        <HardwareHealth health={hardwareHealth} />
      </section>

      <section>
        <Card className="flex flex-col">
          <div className="flex flex-col gap-4 border-b border-slate-100 p-4 sm:flex-row sm:items-end sm:justify-between">
            <h3 className="text-lg font-bold uppercase tracking-wide text-slate-950">
              Historical Readings
            </h3>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <label className="text-sm font-bold uppercase tracking-wide text-slate-700">
                From
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setHistoryPage(1);
                  }}
                  className="ml-2 rounded-lg border border-slate-200 bg-white px-2 py-1 font-medium normal-case text-slate-900 shadow-sm"
                />
              </label>
              <label className="text-sm font-bold uppercase tracking-wide text-slate-700">
                To
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setHistoryPage(1);
                  }}
                  className="ml-2 rounded-lg border border-slate-200 bg-white px-2 py-1 font-medium normal-case text-slate-900 shadow-sm"
                />
              </label>
            </div>
          </div>
          <HistoryTable rows={pagedHistory} />
          <Pagination
            page={historyPage}
            totalPages={historyPages}
            onPageChange={setHistoryPage}
          />
        </Card>
      </section>
    </div>
  );
}
