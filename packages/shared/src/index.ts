import { z } from "zod";

export const AirStatus = z.enum(["safe", "warning", "hazardous"]);
export type AirStatus = z.infer<typeof AirStatus>;

export const EventType = z.enum([
  "threshold",
  "fan_on",
  "fan_off",
  "alert",
  "session_start",
  "session_end",
]);
export type EventType = z.infer<typeof EventType>;

export const TelemetryPayload = z.object({
  ts: z.number(),
  /** MQ-135 raw ADC (0–4095 on ESP32) */
  gasPpm: z.number().nonnegative(),
  /** GP2Y1014AU raw ADC */
  dustUgM3: z.number().nonnegative(),
  /** Instant air-quality score 0–100 (higher is better) */
  cei: z.number().nonnegative().optional(),
  status: AirStatus.optional(),
  fanOn: z.boolean(),
  ledOn: z.boolean(),
});
export type TelemetryPayload = z.infer<typeof TelemetryPayload>;

export const EventPayload = z.object({
  ts: z.number(),
  type: EventType,
  message: z.string(),
});
export type EventPayload = z.infer<typeof EventPayload>;

export const ThresholdsConfig = z.object({
  /** Raw ADC — hazardous above this (default 1000) */
  gasHazardPpm: z.number().positive(),
  /** Raw ADC — warning above this (default 800 = 0.8 × hazard) */
  gasWarningPpm: z.number().positive(),
  dustHazardUgM3: z.number().positive(),
  dustWarningUgM3: z.number().positive(),
  /** Hazardous when CEI score is below this (default 70) */
  ceiHazardBelow: z.number().positive(),
  sensorAdcMax: z.number().positive().default(3000),
  idleLoadThreshold: z.number().min(0).max(1).default(0.05),
  idleTimeoutMinutes: z.number().positive().default(5),
  historyIntervalMs: z.number().positive().default(5000),
});
export type ThresholdsConfig = z.infer<typeof ThresholdsConfig>;

/** Matches standalone firmware: gas 1000, dust 400, CEI < 70 hazardous */
export const DEFAULT_THRESHOLDS: ThresholdsConfig = {
  gasHazardPpm: 1000,
  gasWarningPpm: 800,
  dustHazardUgM3: 400,
  dustWarningUgM3: 320,
  ceiHazardBelow: 70,
  sensorAdcMax: 3000,
  idleLoadThreshold: 0.05,
  idleTimeoutMinutes: 5,
  historyIntervalMs: 5000,
};

export const LatestReading = z.object({
  ts: z.number(),
  gasPpm: z.number(),
  dustUgM3: z.number(),
  cei: z.number(),
  status: AirStatus,
  fanOn: z.boolean(),
  ledOn: z.boolean(),
  gasNorm: z.number().optional(),
  dustNorm: z.number().optional(),
  load: z.number().optional(),
});
export type LatestReading = z.infer<typeof LatestReading>;

export const HistoryEntry = LatestReading;
export type HistoryEntry = z.infer<typeof HistoryEntry>;

export const SessionRecord = z.object({
  sessionId: z.string(),
  deviceId: z.string(),
  startedAt: z.number(),
  endedAt: z.number().nullable(),
  peakGasPpm: z.number(),
  peakDustUgM3: z.number(),
  finalCei: z.number(),
  status: AirStatus,
  sampleCount: z.number(),
});
export type SessionRecord = z.infer<typeof SessionRecord>;

export const StoredEvent = EventPayload.extend({
  id: z.string().optional(),
});
export type StoredEvent = z.infer<typeof StoredEvent>;

export function mqttTelemetryTopic(deviceId: string): string {
  return `fumeguard/${deviceId}/telemetry`;
}

export function mqttEventsTopic(deviceId: string): string {
  return `fumeguard/${deviceId}/events`;
}

function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  if (inMax === inMin) return outMin;
  const clamped = Math.min(inMax, Math.max(inMin, value));
  return outMin + ((clamped - inMin) * (outMax - outMin)) / (inMax - inMin);
}

/** Same as firmware computeCEI(): 0–100 score, higher = cleaner air */
export function computeCei(
  gasAdc: number,
  dustAdc: number,
  thresholds: ThresholdsConfig
): number {
  const max = thresholds.sensorAdcMax;
  const gasScore = mapRange(Math.min(max, Math.max(0, gasAdc)), 0, max, 100, 0);
  const dustScore = mapRange(Math.min(max, Math.max(0, dustAdc)), 0, max, 100, 0);
  return (gasScore + dustScore) / 2;
}

export function normalizeGas(gasAdc: number, thresholds: ThresholdsConfig): number {
  return Math.min(1, gasAdc / thresholds.gasHazardPpm);
}

export function normalizeDust(dustAdc: number, thresholds: ThresholdsConfig): number {
  return Math.min(1, dustAdc / thresholds.dustHazardUgM3);
}

export function computeLoad(
  gasAdc: number,
  dustAdc: number,
  cei: number,
  thresholds: ThresholdsConfig
): number {
  const fromSensors = Math.max(
    normalizeGas(gasAdc, thresholds),
    normalizeDust(dustAdc, thresholds)
  );
  const fromCei = cei < thresholds.ceiHazardBelow ? 1 : 0;
  return Math.max(fromSensors, fromCei);
}

/** Matches firmware evaluateAirQuality() */
export function deriveStatus(
  gasAdc: number,
  dustAdc: number,
  cei: number,
  thresholds: ThresholdsConfig
): AirStatus {
  if (
    gasAdc > thresholds.gasHazardPpm ||
    dustAdc > thresholds.dustHazardUgM3 ||
    cei < thresholds.ceiHazardBelow
  ) {
    return "hazardous";
  }
  if (gasAdc > thresholds.gasWarningPpm || dustAdc > thresholds.dustWarningUgM3) {
    return "warning";
  }
  return "safe";
}
