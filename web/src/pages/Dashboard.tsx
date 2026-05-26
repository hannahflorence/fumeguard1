import { useEffect, useMemo, useState } from "react";
import { Card } from "../components/Card";
import { HardwareHealth } from "../components/HardwareHealth";
import { HistoryTable } from "../components/HistoryTable";
import { MetricCard } from "../components/MetricCard";
import { PAIRED_PANEL_BODY_CLASS } from "../components/PanelFooter";
import { PAGE_SIZE, paginate, Pagination, totalPages } from "../components/Pagination";
import { SessionSummary } from "../components/SessionSummary";
import { StatusBadge } from "../components/StatusBadge";
import { SystemStatus } from "../components/SystemStatus";
import { TrendCharts } from "../components/TrendCharts";
import {
  useEvents,
  useFilteredHistory,
  useHistory,
  useLatest,
  useSessions,
} from "../hooks/useRealtimeData";
import { useHardwareHealth } from "../hooks/useHardwareHealth";
import { DEVICE_ID } from "../lib/firebase";

export function Dashboard() {
  const { data: latest, loading, error } = useLatest();
  const { data: history, loading: historyLoading } = useHistory(80);
  const { data: sessions, loading: sessionsLoading } = useSessions();
  const { data: events } = useEvents(50);
  const hardwareHealth = useHardwareHealth(latest, loading, error);

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [eventsPage, setEventsPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);

  const fromTs = dateFrom ? new Date(dateFrom).getTime() : null;
  const toTs = dateTo ? new Date(dateTo).getTime() + 86400000 - 1 : null;
  const filteredHistory = useFilteredHistory(history, fromTs, toTs);
  const historyNewestFirst = useMemo(
    () => [...filteredHistory].reverse(),
    [filteredHistory]
  );

  const eventsPages = totalPages(events.length);
  const historyPages = totalPages(historyNewestFirst.length);

  useEffect(() => {
    if (eventsPage > eventsPages) {
      setEventsPage(eventsPages);
    }
  }, [eventsPage, eventsPages]);
  const pagedEvents = paginate(events, eventsPage);
  const pagedHistory = paginate(historyNewestFirst, historyPage);

  return (
    <div className="dashboard-ui mx-auto max-w-7xl space-y-6 px-4 py-6 sm:space-y-8 sm:px-6 sm:py-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-bold uppercase tracking-wide text-slate-950 sm:text-2xl">
              Fume Monitoring System
            </h1>
            {latest && <StatusBadge status={latest.status} />}
          </div>
          <p className="mt-1 text-sm font-bold uppercase tracking-wide text-slate-700 sm:text-base">
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
          <SystemStatus latest={latest} />
        </Card>
      </header>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-red-700 shadow-[0_4px_15px_rgba(0,0,0,0.06)]">
          Cannot Reach Firebase: {error}. Start Emulators And The Backend Bridge.
        </div>
      )}

      {loading && !latest && (
        <p className="font-bold uppercase tracking-wide text-slate-700">
          Connecting To Live Data…
        </p>
      )}

      <section className="grid grid-cols-1 gap-4 overflow-visible sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Gas (MQ-135)"
          value={latest ? latest.gasPpm.toFixed(0) : "—"}
          unit="ADC"
        />
        <MetricCard
          label="Dust Sensor"
          value={latest ? latest.dustUgM3.toFixed(0) : "—"}
          unit="ADC"
        />
        <MetricCard
          label="CEI Score"
          value={latest ? latest.cei.toFixed(1) : "—"}
          unit="/ 100"
          sub="Higher Is Cleaner Air"
        />
        <MetricCard
          label="Exposure Load"
          value={latest?.load != null ? (latest.load * 100).toFixed(0) : "—"}
          unit="%"
          sub="Of Hazard Threshold"
        />
      </section>

      <section>
        {!historyLoading && <TrendCharts history={history} />}
      </section>

      <SessionSummary sessions={sessions} loading={sessionsLoading} />

      <section className="grid grid-cols-1 items-stretch gap-6 overflow-visible lg:grid-cols-2">
        <Card className="flex h-full flex-col">
          <h3 className="shrink-0 border-b border-slate-100 p-4 text-lg font-bold uppercase tracking-wide text-slate-950">
            Recent Events
          </h3>
          <ul className={`${PAIRED_PANEL_BODY_CLASS} gap-2 p-4 text-sm`}>
            {events.length === 0 ? (
              <li className="flex flex-1 items-center justify-center font-bold uppercase tracking-wide text-slate-600">
                No Events Yet
              </li>
            ) : (
              Array.from({ length: PAGE_SIZE }, (_, index) => {
                const e = pagedEvents[index];
                if (!e) {
                  return (
                    <li
                      key={`empty-${index}`}
                      className="min-h-[2.35rem] shrink-0"
                      aria-hidden
                    />
                  );
                }
                return (
                  <li
                    key={e.id}
                    className="min-h-[2.35rem] shrink-0 font-medium text-slate-800"
                  >
                    <span className="text-slate-600">
                      {new Date(e.ts).toLocaleTimeString()}{" "}
                    </span>
                    <span className="font-bold uppercase tracking-wide text-sky-700">
                      {e.type.replace(/_/g, " ")}
                    </span>
                    : <span className="uppercase">{e.message}</span>
                  </li>
                );
              })
            )}
          </ul>
          <Pagination
            page={eventsPage}
            totalPages={eventsPages}
            onPageChange={setEventsPage}
            alwaysShow
          />
        </Card>

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
