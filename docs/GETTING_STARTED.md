# FumeGuard — Start from zero

Complete guide: hardware → flash ESP32 → run dashboard with **HiveMQ Cloud**.

---

## Part 1 — What you need

### Hardware (on the bench)

| Part | Role |
|------|------|
| ESP32-WROOM-DA (or ESP32 dev board) | Main controller |
| MQ-135 | Gas sensor → pin **13** |
| GP2Y1014AU0F dust sensor | Particulates → LED **27**, ADC **35** |
| Relay module | Fan → pin **26** |
| Green / yellow / red LEDs | Pins **17**, **19**, **4** |
| Buzzer | Pin **16** |
| 16×2 I2C LCD (optional) | SDA **21**, SCL **22** |
| Power supply / USB cable | ESP32 power + upload |

Pin numbers are in `firmware/include/config.h`.

### Software (on your PC)

| Tool | Install from |
|------|----------------|
| **Node.js 20+** | https://nodejs.org |
| **Git** (if cloning) | https://git-scm.com |
| **VS Code** or **Cursor** | Editor |
| **PlatformIO** extension | VS Code/Cursor extensions → search “PlatformIO” |
| **Firebase CLI** | `npm install -g firebase-tools` |
| **HiveMQ Cloud** account | https://console.hivemq.cloud (free tier) |

You do **not** need Docker if you use HiveMQ (no local Mosquitto).

---

## Part 2 — What you upload to the ESP32

You upload **one thing only**: the **firmware program** (compiled binary).

| Upload to ESP32? | Answer |
|----------------|--------|
| FumeGuard source code | Yes — built and flashed as one program |
| `secrets.h` (WiFi / HiveMQ passwords) | **No separate upload** — it is **compiled into** the firmware before flash |
| Node.js / React / Firebase | **No** — those run on your **PC only** |
| HiveMQ | **No** — cloud service; ESP32 connects over Wi‑Fi |

### Before you flash

1. Copy `firmware/include/secrets.h.example` → `firmware/include/secrets.h`
2. Edit `secrets.h` with your Wi‑Fi and HiveMQ credentials
3. Build + upload from the **`firmware`** folder (PlatformIO)

If you change `secrets.h` later, you must **build and upload again**.

---

## Part 3 — HiveMQ Cloud (5 minutes)

1. Go to https://console.hivemq.cloud and sign in.
2. **Create cluster** (or open an existing one).
3. Open **Access details** / **Connect**.
4. Save:
   - Broker hostname (e.g. `abc123.s1.eu.hivemq.cloud`)
   - Port **8883**
   - Username and password

You will use the **same** hostname and credentials in:

- `firmware/include/secrets.h` (ESP32)
- `.env` in the project root (PC server)

---

## Part 4 — Configure files (two places)

### A) ESP32 — `firmware/include/secrets.h`

```c
#define WIFI_SSID       "YourWiFiName"
#define WIFI_PASSWORD   "YourWiFiPassword"
#define MQTT_HOST       "your-cluster.s1.eu.hivemq.cloud"
#define MQTT_PORT       8883
#define MQTT_USER       "hivemq-username"
#define MQTT_PASS       "hivemq-password"
#define MQTT_SECURE     true
#define DEVICE_ID       "esp32-01"
```

`MQTT_HOST` = hostname **only** (no `mqtts://`).

### B) PC — project root `.env`

Folder: `C:\Users\Nicole\OneDrive\Documents\GitHub\fumeguard1`

```bash
cp .env.example .env
```

Edit `.env`:

```env
MQTT_URL=mqtts://your-cluster.s1.eu.hivemq.cloud:8883
MQTT_USERNAME=hivemq-username
MQTT_PASSWORD=hivemq-password
DEVICE_ID=esp32-01
VITE_DEVICE_ID=esp32-01
```

Keep Firebase emulator lines as in `.env.example` for local development.

---

## Part 5 — Where to run each command

```
fumeguard1/                    ← npm commands run HERE (repo root)
├── package.json
├── .env
├── firmware/                  ← PlatformIO / upload runs HERE
│   ├── platformio.ini
│   └── include/secrets.h
├── server/
└── web/
```

### On the ESP32 (PlatformIO) — folder: `firmware`

Open the **`firmware`** folder in VS Code/Cursor (or open the whole repo and use the PlatformIO sidebar).

| Step | Command or action |
|------|-------------------|
| Install libraries (automatic) | PlatformIO builds once — downloads libs |
| Build | PlatformIO: **Build** (✓) or terminal: `pio run` |
| Upload to board | Plug ESP32 via USB → **Upload** (→) or `pio run -t upload` |
| Serial monitor | `pio device monitor` (115200 baud) |

**Terminal example (PowerShell):**

```powershell
cd "C:\Users\Nicole\OneDrive\Documents\GitHub\fumeguard1\firmware"
pio run -t upload
pio device monitor
```

First upload may ask you to pick the USB **COM port** (e.g. COM3).

### On your PC (Node / Firebase / dashboard) — folder: `fumeguard1` (root)

**Four separate terminal windows**, all starting with:

```powershell
cd "C:\Users\Nicole\OneDrive\Documents\GitHub\fumeguard1"
```

| Terminal | Command | Keep open? |
|----------|---------|------------|
| 1 | `npm install` (once) | — |
| 1 | `npm run build -w @fumeguard/shared` (once) | — |
| 2 | `npm run emulators` | Yes |
| 3 | `npm run seed` | Run once, can close |
| 4 | `npm run dev:server` | Yes |
| 5 | `npm run dev:web` | Yes |

Then power on the ESP32 (USB). **Do not** run `npm run dev:simulator` while testing real hardware.

---

## Part 6 — Verify everything works

### ESP32 serial monitor

You should see:

- WiFi connected  
- `MQTT connect... OK`  
- Gas, dust, CEI, status every ~2 seconds  

### PC

| Check | URL or sign |
|-------|-------------|
| Server connected to HiveMQ | http://localhost:3001/health → `"mqttConnected": true` |
| Firebase emulator | http://localhost:4000 |
| Dashboard | http://localhost:5173 → live numbers and Safe/Warning/Hazardous |

### HiveMQ console

Web client should show messages on topic `fumeguard/esp32-01/telemetry`.

---

## Part 7 — Order checklist (print this)

- [ ] Hardware wired (see `firmware/include/config.h`)
- [ ] HiveMQ cluster + username/password
- [ ] `secrets.h` filled in
- [ ] `.env` filled in (same HiveMQ + same `DEVICE_ID`)
- [ ] `npm install` and `npm run build -w @fumeguard/shared` at repo root
- [ ] `pio run -t upload` from `firmware/` folder
- [ ] `npm run emulators` (root)
- [ ] `npm run seed` (root)
- [ ] `npm run dev:server` (root)
- [ ] `npm run dev:web` (root)
- [ ] Open http://localhost:5173

---

## Common mistakes

| Mistake | Fix |
|---------|-----|
| Running `npm` inside `firmware/` | Use repo **root** for npm |
| Running `pio` in repo root | Use **`firmware/`** for upload |
| `MQTT_HOST` includes `mqtts://` | Hostname only on ESP32 |
| Different passwords in `secrets.h` vs `.env` | Must match HiveMQ credentials |
| Forgot to re-upload after editing `secrets.h` | Build + upload again |
| Simulator + ESP32 both running | Stop simulator (same device ID) |

---

## More detail

- ESP32 + HiveMQ: [ESP32_CONNECTION_GUIDE.md](./ESP32_CONNECTION_GUIDE.md)
- Demo checklist: [DEMO_CHECKLIST.md](./DEMO_CHECKLIST.md)
