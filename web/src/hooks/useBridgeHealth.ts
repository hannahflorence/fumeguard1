import { useEffect, useState } from "react";

function resolveBridgeHealthUrl(): string {
  const configured = import.meta.env.VITE_BRIDGE_HEALTH_URL?.trim() ?? "";
  const url =
    configured || (import.meta.env.DEV ? "http://localhost:3001/health" : "");
  if (!url) return "";

  try {
    const parsed = new URL(url);
    const targetsLocalhost =
      parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
    const pageIsLocalhost =
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1");
    // localhost:3001 is only reachable from localhost dev — not from Vercel
    if (targetsLocalhost && !pageIsLocalhost) return "";
  } catch {
    return "";
  }

  return url;
}

export interface BridgeHealth {
  ok: boolean;
  mqttConnected: boolean;
  loading: boolean;
  error: string | null;
  enabled: boolean;
}

export function useBridgeHealth(): BridgeHealth {
  const [state, setState] = useState<BridgeHealth>({
    ok: false,
    mqttConnected: false,
    loading: true,
    error: null,
    enabled: false,
  });

  useEffect(() => {
    const bridgeHealthUrl = resolveBridgeHealthUrl();
    const enabled = bridgeHealthUrl.length > 0;

    if (!enabled) {
      setState({
        ok: false,
        mqttConnected: false,
        loading: false,
        error: null,
        enabled: false,
      });
      return;
    }

    let stopped = false;

    async function poll() {
      try {
        const res = await fetch(bridgeHealthUrl, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = (await res.json()) as { ok?: boolean; mqttConnected?: boolean };
        if (!stopped) {
          setState({
            ok: body.ok === true,
            mqttConnected: body.mqttConnected === true,
            loading: false,
            error: null,
            enabled: true,
          });
        }
      } catch (err) {
        if (!stopped) {
          setState({
            ok: false,
            mqttConnected: false,
            loading: false,
            error: err instanceof Error ? err.message : String(err),
            enabled: true,
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
