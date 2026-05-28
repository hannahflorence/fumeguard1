import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const useEmulator = import.meta.env.VITE_USE_FIREBASE_EMULATOR === "true";
const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "fumeguard-demo";
const envDatabaseUrl = import.meta.env.VITE_FIREBASE_DATABASE_URL;
const databaseUrl =
  envDatabaseUrl &&
  !envDatabaseUrl.includes("127.0.0.1") &&
  !envDatabaseUrl.includes("localhost")
    ? envDatabaseUrl
    : `https://${projectId}-default-rtdb.firebaseio.com`;

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: databaseUrl,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
};

export const app = initializeApp(firebaseConfig);
const emulatorHost = import.meta.env.VITE_FIREBASE_DATABASE_EMULATOR_HOST ?? "127.0.0.1";
const emulatorPort = Number(import.meta.env.VITE_FIREBASE_DATABASE_EMULATOR_PORT ?? 9000);
const emulatorUrl = `http://${emulatorHost}:${emulatorPort}?ns=${projectId}-default-rtdb`;
export const db = useEmulator ? getDatabase(app, emulatorUrl) : getDatabase(app);

export const DEVICE_ID = import.meta.env.VITE_DEVICE_ID ?? "esp32-01";
