import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
dotenv.config({ path: path.resolve(repoRoot, ".env") });

const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (credentialsPath && !path.isAbsolute(credentialsPath)) {
  process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(repoRoot, credentialsPath);
}

export const config = {  port: Number(process.env.PORT ?? 3001),
  mqttUrl: process.env.MQTT_URL ?? "mqtt://localhost:1883",
  mqttUsername: process.env.MQTT_USERNAME,
  mqttPassword: process.env.MQTT_PASSWORD,
  useFirebaseEmulator: process.env.USE_FIREBASE_EMULATOR === "true",
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID ?? "fumeguard-demo",
  firebaseDatabaseUrl: process.env.FIREBASE_DATABASE_URL,
  firebaseDatabaseEmulatorHost:
    process.env.FIREBASE_DATABASE_EMULATOR_HOST ?? "127.0.0.1:9000",
  defaultDeviceId: process.env.DEVICE_ID ?? "esp32-01",
  historyIntervalMs: Number(process.env.HISTORY_INTERVAL_MS ?? 5000),
};
