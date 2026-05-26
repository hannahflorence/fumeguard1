import { useMemo } from "react";
import type { LatestReading } from "@fumeguard/shared";

/** Telemetry interval on device is 2s; treat older samples as disconnected */
const STALE_MS = 15_000;

export interface HardwareHealthState {
  connected: boolean;
  esp32Online: boolean;
  gasSensorOnline: boolean;
  dustSensorOnline: boolean;
}

export function useHardwareHealth(
  latest: LatestReading | null,
  loading: boolean,
  error: string | null
): HardwareHealthState {
  return useMemo(() => {
    const now = Date.now();
    const fresh =
      latest != null && Number.isFinite(latest.ts) && now - latest.ts < STALE_MS;
    const connected = !loading && !error && fresh;

    const gasSensorOnline =
      connected &&
      latest != null &&
      Number.isFinite(latest.gasPpm) &&
      latest.gasPpm >= 0;

    const dustSensorOnline =
      connected &&
      latest != null &&
      Number.isFinite(latest.dustUgM3) &&
      latest.dustUgM3 >= 0;

    return {
      connected,
      esp32Online: connected,
      gasSensorOnline,
      dustSensorOnline,
    };
  }, [latest, loading, error]);
}
