import { useEffect, useState } from "react";

const BRIDGE_HEALTH_URL =
  import.meta.env.VITE_BRIDGE_HEALTH_URL ?? "http://localhost:3001/health";

export interface BridgeHealth {
  ok: boolean;
  mqttConnected: boolean;
  loading: boolean;
  error: string | null;
}

export function useBridgeHealth(): BridgeHealth {
  const [state, setState] = useState<BridgeHealth>({
    ok: false,
    mqttConnected: false,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let stopped = false;

    async function poll() {
      try {
        const res = await fetch(BRIDGE_HEALTH_URL, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = (await res.json()) as { ok?: boolean; mqttConnected?: boolean };
        if (!stopped) {
          setState({
            ok: body.ok === true,
            mqttConnected: body.mqttConnected === true,
            loading: false,
            error: null,
          });
        }
      } catch (err) {
        if (!stopped) {
          setState({
            ok: false,
            mqttConnected: false,
            loading: false,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }

    void poll();
    const timer = window.setInterval(() => {
      void poll();
    }, 5000);

    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, []);

  return state;
}
