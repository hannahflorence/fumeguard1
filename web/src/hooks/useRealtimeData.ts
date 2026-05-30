import { useEffect, useState } from "react";
import {
  LatestReading as LatestReadingSchema,
  type LatestReading,
} from "@fumeguard/shared";
import { DEVICE_ID } from "../lib/firebase";

const USE_EMULATOR = import.meta.env.VITE_USE_FIREBASE_EMULATOR === "true";
const PROJECT_ID = import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "fumeguard-demo";
const EMULATOR_HOST = import.meta.env.VITE_FIREBASE_DATABASE_EMULATOR_HOST ?? "127.0.0.1";
const EMULATOR_PORT = Number(import.meta.env.VITE_FIREBASE_DATABASE_EMULATOR_PORT ?? 9000);
const PRODUCTION_DB_URL = (import.meta.env.VITE_FIREBASE_DATABASE_URL ?? "").replace(/\/$/, "");
const LATEST_POLL_MS = 3000;
const HISTORY_POLL_MS = 4000;

async function fetchRtdbJson(path: string): Promise<unknown> {
  const url = USE_EMULATOR
    ? `http://${EMULATOR_HOST}:${EMULATOR_PORT}/${path}.json?ns=${PROJECT_ID}-default-rtdb`
    : `${PRODUCTION_DB_URL}/${path}.json`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${path}`);
  return (await res.json()) as unknown;
}

function normalizeLatest(value: unknown): LatestReading | null {
  if (value == null) return null;
  const parsed = LatestReadingSchema.safeParse(value);
  if (!parsed.success) {
    console.warn("[FumeGuard] Invalid latest reading from Firebase:", parsed.error.flatten());
    return null;
  }
  return parsed.data;
}

export function useLatest() {
  const [data, setData] = useState<LatestReading | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stopped = false;

    async function poll() {
      try {
        const raw = await fetchRtdbJson(`devices/${DEVICE_ID}/latest`);
        const normalized = normalizeLatest(raw);
        if (!stopped) {
          setData(normalized);
          setLoading(false);
          setError(null);
        }
      } catch (err) {
        if (!stopped) {
          setLoading(false);
          setError(err instanceof Error ? err.message : String(err));
        }
      }
    }

    void poll();
    const timer = window.setInterval(() => {
      void poll();
    }, LATEST_POLL_MS);

    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, []);

  return { data, loading, error };
}

export function useHistory(limit = 60) {
  const [data, setData] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let stopped = false;

    async function poll() {
      try {
        const raw = await fetchRtdbJson(`devices/${DEVICE_ID}/history`);
        const points: HistoryPoint[] = [];
        if (raw && typeof raw === "object") {
          for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
            const normalized = normalizeLatest(value);
            if (!normalized) continue;
            points.push({ id, ...normalized });
          }
        }
        points.sort((a, b) => a.ts - b.ts);
        const sliced = points.slice(Math.max(0, points.length - limit));
        if (!stopped) {
          setData(sliced);
          setLoading(false);
        }
      } catch {
        if (!stopped) setLoading(false);
      }
    }

    void poll();
    const timer = window.setInterval(() => {
      void poll();
    }, HISTORY_POLL_MS);

    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [limit]);

  return { data, loading };
}

export interface HistoryPoint extends LatestReading {
  id: string;
}

export function useFilteredHistory(
  allHistory: HistoryPoint[],
  fromTs: number | null,
  toTs: number | null
) {
  return allHistory.filter((p) => {
    if (fromTs && p.ts < fromTs) return false;
    if (toTs && p.ts > toTs) return false;
    return true;
  });
}
