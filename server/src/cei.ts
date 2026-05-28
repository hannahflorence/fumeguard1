import {
  ThresholdsConfig,
  computeCei,
  computeLoad,
  deriveStatus,
  normalizeDust,
  normalizeGas,
  type AirStatus,
  type LatestReading,
} from "@fumeguard/shared";

export interface DeviceState {
  lastTs: number | null;
  sessionId: string | null;
  sessionStartedAt: number | null;
  sessionPeakGas: number;
  sessionPeakDust: number;
  sessionSampleCount: number;
  lastIdleTs: number | null;
}

export function createDeviceState(): DeviceState {
  return {
    lastTs: null,
    sessionId: null,
    sessionStartedAt: null,
    sessionPeakGas: 0,
    sessionPeakDust: 0,
    sessionSampleCount: 0,
    lastIdleTs: null,
  };
}

export interface ProcessedSample {
  reading: LatestReading;
  sessionId: string | null;
  sessionStarted: boolean;
  sessionEnded: boolean;
  sessionSummary?: {
    sessionId: string;
    startedAt: number;
    endedAt: number;
    peakGasPpm: number;
    peakDustUgM3: number;
    finalCei: number;
    status: AirStatus;
    sampleCount: number;
  };
}

function newSessionId(deviceId: string): string {
  return `${deviceId}-${Date.now()}`;
}

export function processTelemetry(
  deviceId: string,
  gasAdc: number,
  dustAdc: number,
  fanOn: boolean,
  ledOn: boolean,
  ts: number,
  thresholds: ThresholdsConfig,
  state: DeviceState,
  firmwareCei?: number
): ProcessedSample {
  const computedCei = computeCei(gasAdc, dustAdc, thresholds);
  // Use computed CEI as canonical source to keep status/actuator logic
  // consistent when firmware payload CEI is stale or differently scaled.
  const cei = computedCei;

  const gasNorm = normalizeGas(gasAdc, thresholds);
  const dustNorm = normalizeDust(dustAdc, thresholds);
  const load = computeLoad(gasAdc, dustAdc, cei, thresholds);

  state.lastTs = ts;

  let sessionStarted = false;
  let sessionEnded = false;
  let sessionSummary: ProcessedSample["sessionSummary"];

  const isActive = load > thresholds.idleLoadThreshold;
  const idleTimeoutMs = thresholds.idleTimeoutMinutes * 60 * 1000;

  if (isActive) {
    state.lastIdleTs = null;
    if (!state.sessionId) {
      state.sessionId = newSessionId(deviceId);
      state.sessionStartedAt = ts;
      state.sessionPeakGas = gasAdc;
      state.sessionPeakDust = dustAdc;
      state.sessionSampleCount = 0;
      sessionStarted = true;
    }
    state.sessionPeakGas = Math.max(state.sessionPeakGas, gasAdc);
    state.sessionPeakDust = Math.max(state.sessionPeakDust, dustAdc);
    state.sessionSampleCount += 1;
  } else {
    if (state.lastIdleTs === null) {
      state.lastIdleTs = ts;
    } else if (
      state.sessionId &&
      state.sessionStartedAt &&
      ts - state.lastIdleTs >= idleTimeoutMs
    ) {
      sessionSummary = {
        sessionId: state.sessionId,
        startedAt: state.sessionStartedAt,
        endedAt: ts,
        peakGasPpm: state.sessionPeakGas,
        peakDustUgM3: state.sessionPeakDust,
        finalCei: cei,
        status: deriveStatus(gasAdc, dustAdc, cei, thresholds),
        sampleCount: state.sessionSampleCount,
      };
      sessionEnded = true;
      state.sessionId = null;
      state.sessionStartedAt = null;
      state.sessionPeakGas = 0;
      state.sessionPeakDust = 0;
      state.sessionSampleCount = 0;
      state.lastIdleTs = null;
    }
  }

  const status = deriveStatus(gasAdc, dustAdc, cei, thresholds);

  const reading: LatestReading = {
    ts,
    gasPpm: gasAdc,
    dustUgM3: dustAdc,
    cei: Math.round(cei * 10) / 10,
    status,
    fanOn,
    ledOn,
    gasNorm: Math.round(gasNorm * 1000) / 1000,
    dustNorm: Math.round(dustNorm * 1000) / 1000,
    load: Math.round(load * 1000) / 1000,
  };

  return {
    reading,
    sessionId: state.sessionId,
    sessionStarted,
    sessionEnded,
    sessionSummary,
  };
}
