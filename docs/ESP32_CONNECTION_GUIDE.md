# Connecting FumeGuard Software to ESP32 Hardware (HiveMQ)

Use this guide **after** firmware is compiled and uploaded. FumeGuard uses **[HiveMQ Cloud](https://www.hivemq.com/mqtt-cloud/)** as the MQTT broker. The ESP32 and your PC (Node bridge) both connect to the **same HiveMQ cluster** over the internet.

## How the pieces connect

```
┌─────────────┐                    ┌─────────────────────┐
│   ESP32     │ ─── WiFi / TLS ──► │   HiveMQ Cloud      │
│  (sensors)  │   publish          │   (MQTT broker)     │
└─────────────┘                    └──────────┬──────────┘
                                              │ subscribe
┌─────────────┐                               │
│  Your PC    │ ─── internet / TLS ──────────┘
│ Node server │   (MQTT bridge)
└──────┬──────┘
       │ write
       ▼
┌─────────────────┐       ┌──────────────────┐
│ Firebase RTDB   │ ◄──── │ React dashboard  │
│ (emulator/cloud)│ read  │ localhost:5173   │
└─────────────────┘       └──────────────────┘
```

The ESP32 does **not** talk to Firebase directly. It only publishes to HiveMQ. Your PC runs the bridge, database, and dashboard.

---

## Requirements

| Item | Notes |
|------|--------|
| ESP32 with FumeGuard firmware uploaded | `firmware/` + PlatformIO |
| **HiveMQ Cloud** cluster | Free tier is fine for demos |
| PC with Node.js 20+ | `npm install` at repo root |
| Firebase CLI | Local emulator or production project |
| Wi‑Fi with internet | ESP32 must reach HiveMQ (port **8883**) |
| `firmware/include/secrets.h` | WiFi + HiveMQ host, user, password |

You do **not** need Docker/Mosquitto when using HiveMQ.

---

## Step 1 — Create and configure HiveMQ Cloud

1. Sign in at [console.hivemq.cloud](https://console.hivemq.cloud).
2. Create a **cluster** (if you do not have one).
3. Open the cluster → **Access details** (or **Connect**).
4. Note:
   - **Broker URL** (e.g. `abc123.s1.eu.hivemq.cloud`)
   - **Port** `8883` (TLS)
   - **Username** and **Password** (create credentials in the console if needed)

5. Ensure your plan allows publish/subscribe on custom topics (default serverless plans do).

Topics used by FumeGuard (no extra setup if ACL allows `#` or `fumeguard/#`):

| Topic | Direction | Who |
|-------|-----------|-----|
| `fumeguard/{deviceId}/telemetry` | Publish | ESP32 |
| `fumeguard/{deviceId}/events` | Publish | ESP32 |
| `fumeguard/+/telemetry` | Subscribe | Node server |
| `fumeguard/+/events` | Subscribe | Node server |

---

## Step 2 — Configure the ESP32 (`secrets.h`)

1. Copy the template:
   ```bash
   cp firmware/include/secrets.h.example firmware/include/secrets.h
   ```
2. Edit `firmware/include/secrets.h`:

   | Setting | HiveMQ value |
   |---------|----------------|
   | `WIFI_SSID` | Your Wi‑Fi name |
   | `WIFI_PASSWORD` | Your Wi‑Fi password |
   | `MQTT_HOST` | Cluster hostname only (e.g. `abc123.s1.eu.hivemq.cloud`) |
   | `MQTT_PORT` | `8883` |
   | `MQTT_USER` | HiveMQ username |
   | `MQTT_PASS` | HiveMQ password |
   | `MQTT_SECURE` | `true` |
   | `DEVICE_ID` | `esp32-01` (see Step 3) |

3. Rebuild and upload:
   ```bash
   cd firmware
   pio run -t upload
   ```

Firmware uses TLS (`WiFiClientSecure` + `MQTT_SECURE true`). For development it uses `setInsecure()` so you do not need to embed a CA certificate on the ESP32.

---

## Step 3 — Match device ID in `.env`

```bash
cp .env.example .env
```

Set (must match `DEVICE_ID` in `secrets.h`):

```env
DEVICE_ID=esp32-01
VITE_DEVICE_ID=esp32-01
```

---

## Step 4 — Configure the PC bridge (`.env`)

Point the Node server at the **same** HiveMQ cluster:

```env
MQTT_URL=mqtts://YOUR-CLUSTER.s1.eu.hivemq.cloud:8883
MQTT_USERNAME=your-hivemq-username
MQTT_PASSWORD=your-hivemq-password

USE_FIREBASE_EMULATOR=true
FIREBASE_PROJECT_ID=fumeguard-demo
FIREBASE_DATABASE_EMULATOR_HOST=127.0.0.1:9000
VITE_USE_FIREBASE_EMULATOR=true
VITE_DEVICE_ID=esp32-01
```

Replace `YOUR-CLUSTER...` and credentials with your HiveMQ access details. Use the `mqtts://` prefix and port **8883**.

---

## Step 5 — Start the software stack

Use **separate terminals**. Do **not** run `npm run dev:simulator` while testing the real ESP32 (same `DEVICE_ID` will conflict).

| Order | Command | Notes |
|-------|---------|--------|
| 1 | `npm run emulators` | Firebase DB (9000) + Auth (9099) |
| 2 | `npm run seed` | Default thresholds |
| 3 | `npm run dev:server` | Connects to **HiveMQ**; health on port 3001 |
| 4 | Power on ESP32 | Publishes every ~2 s to HiveMQ |
| 5 | `npm run dev:web` | http://localhost:5173 |

**Skip** `npm run broker` — that is only for local Mosquitto.

---

## Step 6 — Verify the ESP32 (serial monitor)

```bash
cd firmware
pio device monitor -b 115200
```

Expected:

- WiFi connected.
- `MQTT: Secure TLS mode enabled` then `MQTT connect... OK`.
- Every ~2 s: gas/dust ADC, CEI, status.
- LEDs/fan match Safe / Warning / Hazardous.

If MQTT fails:

- Wrong host, user, or password in `secrets.h`.
- ESP32 has no internet (guest Wi‑Fi, captive portal, etc.).
- Typo in cluster URL (no `mqtts://` in `MQTT_HOST`).

---

## Step 7 — Verify bridge and dashboard

### Server health

**http://localhost:3001/health**

```json
{
  "ok": true,
  "mqttConnected": true,
  ...
}
```

`mqttConnected` must be `true` (PC reached HiveMQ).

### HiveMQ Cloud console

In the cluster **Web Client** or **Metrics**, you should see clients connected and messages on `fumeguard/esp32-01/telemetry`.

### Dashboard

**http://localhost:5173** — live gas/dust ADC, CEI, status, actuators, hardware health **Online**.

---

## Debug with MQTT Explorer

1. Install [MQTT Explorer](http://mqtt-explorer.com/).
2. Connect with the same settings as `.env`:
   - Protocol: **MQTTS** / SSL  
   - Host: your HiveMQ hostname  
   - Port: **8883**  
   - Username / password: from HiveMQ console  
3. Subscribe to `fumeguard/#` and confirm messages from the ESP32.

---

## Example telemetry payload

```json
{
  "ts": 1710000000000,
  "gasPpm": 450,
  "dustUgM3": 120,
  "cei": 82.5,
  "status": "safe",
  "fanOn": false,
  "ledOn": false
}
```

`gasPpm` / `dustUgM3` are **raw ADC** values (legacy field names).

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|----------------|-----|
| `mqttConnected: false` | Wrong `.env` URL or credentials | Match HiveMQ access details; use `mqtts://` |
| ESP32 MQTT fail | `secrets.h` mismatch | Same host/user/pass as `.env`; `MQTT_SECURE true` |
| Dashboard empty | Firebase/server not running | `emulators` → `seed` → `dev:server` |
| Duplicate/weird data | Simulator running | Stop `npm run dev:simulator` |
| Hardware health Offline | No messages on HiveMQ | Check Web Client; fix ESP32 MQTT |
| TLS errors on PC | Corporate proxy/firewall | Allow outbound 8883; try another network |

---

## Optional: local Mosquitto (no HiveMQ)

For fully offline development:

1. `npm run broker` (Docker Mosquitto on port 1883).
2. `.env`: `MQTT_URL=mqtt://localhost:1883`, clear username/password.
3. `secrets.h`: PC LAN IP, port `1883`, `MQTT_SECURE false`.

See commented blocks in `.env.example` and `secrets.h.example`.

---

## Quick checklist (HiveMQ)

- [ ] HiveMQ cluster created; username/password noted  
- [ ] `secrets.h`: host, port 8883, user, pass, `MQTT_SECURE true`  
- [ ] `.env`: `mqtts://...:8883` with **same** credentials  
- [ ] `DEVICE_ID` matches in `secrets.h`, `DEVICE_ID`, `VITE_DEVICE_ID`  
- [ ] `emulators` → `seed` → `dev:server` → `dev:web`  
- [ ] Serial: MQTT OK  
- [ ] `/health` → `mqttConnected: true`  
- [ ] Dashboard matches ESP32 LEDs/fan  

See also [DEMO_CHECKLIST.md](./DEMO_CHECKLIST.md).
