import { useEffect, useState } from "react";
import {
  limitToLast,
  onValue,
  orderByChild,
  query,
  ref,
} from "firebase/database";
import {
  LatestReading as LatestReadingSchema,
  type LatestReading,
} from "@fumeguard/shared";
import { db, DEVICE_ID } from "../lib/firebase";

const USE_EMULATOR = import.meta.env.VITE_USE_FIREBASE_EMULATOR === "true";
const PROJECT_ID = import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "fumeguard-demo";
const EMULATOR_HOST = import.meta.env.VITE_FIREBASE_DATABASE_EMULATOR_HOST ?? "127.0.0.1";
const EMULATOR_PORT = Number(import.meta.env.VITE_FIREBASE_DATABASE_EMULATOR_PORT ?? 9000);
const EMULATOR_BASE = `http://${EMULATOR_HOST}:${EMULATOR_PORT}`;
const EMULATOR_NS = `${PROJECT_ID}-default-rtdb`;

async function fetchEmulatorJson(path: string): Promise<unknown> {
  const url = `${EMULATOR_BASE}/${path}.json?ns=${EMULATOR_NS}`;
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
    if (USE_EMULATOR) {
      let stopped = false;
      async function poll() {
        try {
          const raw = await fetchEmulatorJson(`devices/${DEVICE_ID}/latest`);
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
      }, 3000);
      return () => {
        stopped = true;
        window.clearInterval(timer);
      };
    }

    const r = ref(db, `devices/${DEVICE_ID}/latest`);

    const unsub = onValue(
      r,
      (snap) => {
        if (!snap.exists()) {
          setData(null);
          setLoading(false);
          setError(null);
          return;
        }
        const normalized = normalizeLatest(snap.val());
        setData(normalized);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  return { data, loading, error };
}

export function useHistory(limit = 60) {
  const [data, setData] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (USE_EMULATOR) {
      let stopped = false;
      async function poll() {
        try {
          const raw = await fetchEmulatorJson(`devices/${DEVICE_ID}/history`);
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
      }, 4000);
      return () => {
        stopped = true;
        window.clearInterval(timer);
      };
    }

    const r = ref(db, `devices/${DEVICE_ID}/history`);
    const q = query(r, orderByChild("ts"), limitToLast(limit));
    const unsub = onValue(q, (snap) => {
      const points: HistoryPoint[] = [];
      snap.forEach((child) => {
        const normalized = normalizeLatest(child.val());
        if (!normalized || !child.key) return;
        points.push({ id: child.key, ...normalized });
      });
      points.sort((a, b) => a.ts - b.ts);
      setData(points);
      setLoading(false);
    });
    return () => unsub();
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
