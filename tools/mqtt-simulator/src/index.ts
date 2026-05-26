import dotenv from "dotenv";
import mqtt from "mqtt";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_THRESHOLDS,
  computeCei,
  deriveStatus,
  mqttEventsTopic,
  mqttTelemetryTopic,
  type EventPayload,
  type TelemetryPayload,
} from "@fumeguard/shared";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const deviceId = process.env.DEVICE_ID ?? "esp32-01";
const mqttUrl = process.env.MQTT_URL ?? "mqtt://localhost:1883";
const intervalMs = Number(process.env.SIM_INTERVAL_MS ?? 2000);

const thresholds = DEFAULT_THRESHOLDS;

let gasAdc = 400;
let dustAdc = 150;
let fanOn = false;
let ledOn = false;
let phase = 0;

const client = mqtt.connect(mqttUrl, {
  clientId: `fumeguard-sim-${Date.now()}`,
  username: process.env.MQTT_USERNAME,
  password: process.env.MQTT_PASSWORD,
});

function publishEvent(type: EventPayload["type"], message: string) {
  const payload: EventPayload = { ts: Date.now(), type, message };
  client.publish(mqttEventsTopic(deviceId), JSON.stringify(payload));
}

client.on("connect", () => {
  console.log(`[simulator] Publishing as ${deviceId} every ${intervalMs}ms`);
  setInterval(tick, intervalMs);
});

function tick() {
  phase += 0.08;
  const spike = Math.sin(phase) > 0.65 ? 1.6 : 1;
  gasAdc = Math.max(
    50,
    350 + Math.sin(phase * 1.2) * 450 * spike + Math.random() * 80
  );
  dustAdc = Math.max(
    30,
    120 + Math.sin(phase * 0.9) * 180 * spike + Math.random() * 40
  );

  const cei = computeCei(gasAdc, dustAdc, thresholds);
  const status = deriveStatus(gasAdc, dustAdc, cei, thresholds);

  const prevFan = fanOn;
  fanOn = status === "warning" || status === "hazardous";
  ledOn = status !== "safe";

  if (fanOn && !prevFan) publishEvent("fan_on", "Exhaust fan activated");
  if (!fanOn && prevFan) publishEvent("fan_off", "Exhaust fan deactivated");
  if (status === "hazardous") {
    publishEvent("alert", "Hazardous air quality detected");
  }

  const telemetry: TelemetryPayload = {
    ts: Date.now(),
    gasPpm: Math.round(gasAdc),
    dustUgM3: Math.round(dustAdc),
    cei: Math.round(cei * 10) / 10,
    status,
    fanOn,
    ledOn,
  };

  client.publish(mqttTelemetryTopic(deviceId), JSON.stringify(telemetry));
}

client.on("error", (err) => console.error("[simulator]", err.message));
