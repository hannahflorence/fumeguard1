# FumeGuard demo checklist

Use this before a presentation or milestone review.

## Pre-flight

- [ ] HiveMQ Cloud cluster ready (or Docker if using local Mosquitto)
- [ ] `.env` copied from `.env.example`
- [ ] `npm install` completed
- [ ] `npm run build -w @fumeguard/shared` completed

## Start stack (in order)

1. [ ] `.env` — `MQTT_URL=mqtts://...hivemq.cloud:8883` + username/password
2. [ ] `npm run emulators` — Firebase DB (9000) + Auth (9099)
3. [ ] `npm run seed` — thresholds in `config/thresholds`
4. [ ] `npm run dev:server` — health OK at http://localhost:3001/health
5. [ ] `npm run dev:simulator` **or** ESP32 on Wi‑Fi with internet (HiveMQ)
6. [ ] `npm run dev:web` — http://localhost:5173

## Verify success criteria (proposal §8)

- [ ] Dashboard shows **Safe / Warning / Hazardous** status changing
- [ ] Gas, dust, and **CEI** values update every ~2s
- [ ] Line chart trends move with new data
- [ ] History table receives rows
- [ ] **Fan** and **LED** indicators match simulator/ESP32
- [ ] Events list shows `fan_on`, `alert`, etc. when thresholds crossed
- [ ] Session bar chart populates after sustained exposure

## ESP32-specific

- [ ] `firmware/include/secrets.h` configured (WiFi + HiveMQ host, user, pass, `MQTT_SECURE true`)
- [ ] `DEVICE_ID` matches `.env` (`esp32-01` default)
- [ ] Serial monitor shows WiFi + MQTT connected
- [ ] LCD shows gas, dust, CEI, status

## Production readiness (later)

- [ ] Firebase project + service account
- [ ] RTDB rules deployed (`database.rules.json`)
- [ ] HiveMQ credentials in `.env` and `secrets.h`
- [ ] `USE_FIREBASE_EMULATOR=false` in `.env`
