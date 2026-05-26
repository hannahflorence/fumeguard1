import { useMemo, useState } from "react";
import { Card } from "../components/Card";
import { HistoryTable } from "../components/HistoryTable";
import { MetricCard } from "../components/MetricCard";
import { paginate, Pagination, totalPages } from "../components/Pagination";
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
import { DEVICE_ID } from "../lib/firebase";

export function Dashboard() {
  const { data: latest, loading, error } = useLatest();
  const { data: history, loading: historyLoading } = useHistory(80);
  const { data: sessions, loading: sessionsLoading } = useSessions();
  const { data: events } = useEvents(50);

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
  const pagedEvents = paginate(events, eventsPage);
  const pagedHistory = paginate(historyNewestFirst, historyPage);

  const activeSession = useMemo(
    () => sessions.find((s) => s.endedAt === null),
    [sessions]
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:space-y-8 sm:px-6 sm:py-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Solder Fume Monitoring System
            </h1>
            {latest && <StatusBadge status={latest.status} />}
          </div>
          <p className="mt-1 text-sm font-medium text-slate-700 sm:text-base">
            Device{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 font-semibold text-sky-700">
              {DEVICE_ID}
            </code>
          </p>
        </div>

        <Card className="w-full shrink-0 p-3 sm:w-auto">
          <h3 className="mb-2 text-sm font-bold text-slate-900">System actuators</h3>
          <SystemStatus latest={latest} />
        </Card>
      </header>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 shadow-[0_4px_15px_rgba(0,0,0,0.06)]">
          Cannot reach Firebase: {error}. Start emulators and the backend bridge.
        </div>
      )}

      {loading && !latest && (
        <p className="font-medium text-slate-700">Connecting to live data…</p>
      )}

      <section className="grid grid-cols-1 gap-4 overflow-visible sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Gas (MQ-135)"
          value={latest ? latest.gasPpm.toFixed(1) : "—"}
          unit="ppm"
        />
        <MetricCard
          label="Particulates"
          value={latest ? latest.dustUgM3.toFixed(1) : "—"}
          unit="µg/m³"
        />
        <MetricCard
          label="Cumulative Exposure"
          value={latest ? latest.cei.toFixed(1) : "—"}
          unit="CEI"
          sub={activeSession ? "Active session" : "Idle / no session"}
        />
        <MetricCard
          label="Exposure load"
          value={latest?.load != null ? (latest.load * 100).toFixed(0) : "—"}
          unit="%"
          sub="Of hazard threshold"
        />
      </section>

      <section>
        {!historyLoading && <TrendCharts history={history} />}
      </section>

      <SessionSummary sessions={sessions} loading={sessionsLoading} />

      <section className="grid grid-cols-1 gap-6 overflow-visible lg:grid-cols-2">
        <Card className="flex flex-col">
          <h3 className="border-b border-slate-100 p-4 text-lg font-bold text-slate-950">
            Recent events
          </h3>
          <ul className="min-h-[12rem] flex-1 space-y-2 p-4 text-sm">
            {pagedEvents.length === 0 && (
              <li className="font-medium text-slate-600">No events yet</li>
            )}
            {pagedEvents.map((e) => (
              <li key={e.id} className="font-medium text-slate-800">
                <span className="text-slate-600">
                  {new Date(e.ts).toLocaleTimeString()}{" "}
                </span>
                <span className="font-semibold text-sky-700">{e.type}</span>: {e.message}
              </li>
            ))}
          </ul>
          <Pagination
            page={eventsPage}
            totalPages={eventsPages}
            onPageChange={setEventsPage}
          />
        </Card>

        <Card className="flex flex-col">
          <div className="flex flex-col gap-4 border-b border-slate-100 p-4 sm:flex-row sm:items-end sm:justify-between">
            <h3 className="text-lg font-bold text-slate-950">Historical readings</h3>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <label className="text-sm font-semibold text-slate-700">
                From
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setHistoryPage(1);
                  }}
                  className="ml-2 rounded-lg border border-slate-200 bg-white px-2 py-1 text-slate-900 shadow-sm"
                />
              </label>
              <label className="text-sm font-semibold text-slate-700">
                To
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setHistoryPage(1);
                  }}
                  className="ml-2 rounded-lg border border-slate-200 bg-white px-2 py-1 text-slate-900 shadow-sm"
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
