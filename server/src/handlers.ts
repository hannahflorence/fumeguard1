import {
  DEFAULT_THRESHOLDS,
  TelemetryPayload,
  ThresholdsConfig,
} from "@fumeguard/shared";
import type admin from "firebase-admin";
import { config } from "./config.js";
import { createDeviceState, processTelemetry, type DeviceState } from "./cei.js";

const deviceStates = new Map<string, DeviceState>();
const lastHistoryWrite = new Map<string, number>();
let cachedThresholds: ThresholdsConfig = DEFAULT_THRESHOLDS;
let thresholdsLoadedAt = 0;

async function loadThresholds(db: admin.database.Database): Promise<ThresholdsConfig> {
  const now = Date.now();
  if (now - thresholdsLoadedAt < 30_000) {
    return cachedThresholds;
  }
  const snap = await db.ref("config/thresholds").once("value");
  if (snap.exists()) {
    const val = snap.val() as Record<string, unknown>;
    cachedThresholds = {
      ...DEFAULT_THRESHOLDS,
      ...val,
      ceiHazardBelow:
        (val.ceiHazardBelow as number | undefined) ??
        (val.ceiHazard as number | undefined) ??
        DEFAULT_THRESHOLDS.ceiHazardBelow,
    };
  } else {
    cachedThresholds = DEFAULT_THRESHOLDS;
  }
  thresholdsLoadedAt = now;
  return cachedThresholds;
}

function getState(deviceId: string): DeviceState {
  let state = deviceStates.get(deviceId);
  if (!state) {
    state = createDeviceState();
    deviceStates.set(deviceId, state);
  }
  return state;
}

export function createMqttHandlers(db: admin.database.Database) {
  return {
    async onTelemetry(topic: string, raw: string): Promise<void> {
      const deviceId = topic.split("/")[1];
      if (!deviceId) return;

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        console.warn("[mqtt] Invalid JSON on", topic);
        return;
      }

      const result = TelemetryPayload.safeParse(parsed);
      if (!result.success) {
        console.warn("[mqtt] Invalid telemetry:", result.error.flatten());
        return;
      }

      const payload = result.data;
      const thresholds = await loadThresholds(db);
      const state = getState(deviceId);
      const processed = processTelemetry(
        deviceId,
        payload.gasPpm,
        payload.dustUgM3,
        payload.fanOn,
        payload.ledOn,
        payload.ts,
        thresholds,
        state,
        payload.cei
      );

      const latestRef = db.ref(`devices/${deviceId}/latest`);
      await latestRef.set(processed.reading);

      const interval =
        thresholds.historyIntervalMs ?? config.historyIntervalMs;
      const lastWrite = lastHistoryWrite.get(deviceId) ?? 0;
      const shouldWriteHistory = processed.reading.ts - lastWrite >= interval;

      if (shouldWriteHistory) {
        await db.ref(`devices/${deviceId}/history`).push(processed.reading);
        lastHistoryWrite.set(deviceId, processed.reading.ts);
      }
    },
  };
}
