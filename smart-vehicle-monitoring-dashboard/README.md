# DriveSafe — Smart Vehicle Black Box Web Dashboard

A professional telematics dashboard for the **ESP32-based DriveSafe V2.1 vehicle black box**.
It visualises live GPS speed & position, MPU6050 acceleration/gyroscope data, driving-event
detection, driver safety scoring, trip history and analytics — in real time — and ships with a
clearly-labelled **Demo Mode** for safe classroom demonstration without hardware.

Built with React + TypeScript, Tailwind CSS, **Leaflet.js** (map) and **Chart.js** (graphs).

The ESP32 firmware source is included at `src/esp32/drivesafe_v2.1/drivesafe_v2.1.ino`.

---

## 1. Project overview

DriveSafe is a driver-monitoring / black-box system. The ESP32 in the vehicle collects telemetry
(GPS speed, fix, satellites, position + MPU6050 3-axis acceleration and gyro), detects events
(harsh acceleration, harsh braking, turns, overspeed, accident), scores the driver and exposes the
data over Wi-Fi. This web application connects to the ESP32, renders everything live, records
trips/events locally in the browser, and provides an emergency accident interface.

**Real data and demo data are strictly separated.** Every packet carries a `source` tag
(`esp32` or `demo`), shown as `HW` / `DEMO` badges throughout the UI.

## 2. Features

- Live dashboard: trip status, animated circular speedometer with SAFE / CAUTION / OVERSPEED zones
- Driver safety score (0–100) with animated ring and per-event penalty reasons
- Current-event banner: Normal / Harsh Accel / Harsh Brake / Left–Right Turn / Overspeed / Accident
  (critical events flash; accident triggers the emergency overlay)
- GPS card: fix state, satellites, lat/lng, GPS speed, accuracy, heading — plus a graceful
  *GPS SIGNAL LOST* state
- Interactive Leaflet map: vehicle marker (heading-rotated), live trip path, accuracy circle,
  *CENTER VEHICLE*, *CLEAR ROUTE*, *OPEN IN GOOGLE MAPS* (URL built dynamically from the live fix)
- MPU6050 monitoring: live Chart.js acceleration & gyroscope graphs (rolling window, capped history)
- Event history table: Time / Event / Speed / Lat / Lng / Severity / Score Impact, type + date/time
  filters, CSV export
- Trips: automatic start/stop detection, full trip summary modal (duration, distance, average &
  max speed, event breakdown, final score, speed-profile + event charts), persisted history
- Analytics: totals (trips, distance, time, harsh events, accidents) + 5 charts
- Connection panel: ESP32 link state with automatic reconnection & backoff; GPS / MPU6050 /
  OLED / Buzzer rows **only shown when actually determinable** from received data
- Buzzer mirror: shows the severity pattern class (short / triple / emergency) — the web app never
  claims to drive the physical buzzer
- Settings (browser `localStorage`): speed limit, harsh-accel / harsh-brake / accident thresholds,
  dark/light theme, auto refresh, map tracking, sound alerts, browser notifications, ESP32 endpoint
  & poll interval, demo origin coordinates
- Browser notifications + Web-Audio alert patterns (mirroring the buzzer semantics)
- Demo Mode: scenario simulator with one-tap event injection (harsh accel, harsh brake, left/right
  turn, overspeed, accident), clearly badged everywhere

## 3. Hardware requirements

| Part | Purpose |
|---|---|
| ESP32 DevKit | Main controller + Wi-Fi web server |
| NEO-6M (or similar) GPS | Speed, position, satellites, fix |
| MPU6050 | 3-axis acceleration + gyroscope |
| SSD1306 OLED | On-device display (optional) |
| Buzzer | Audible warnings (GPIO 27) |
| LED | Status (GPIO 13) |
| Button | Trip start/stop (GPIO 32) |

### Fixed DriveSafe wiring

```
OLED SDA / MPU6050 SDA → GPIO 21
OLED SCL / MPU6050 SCL → GPIO 22
Button                 → GPIO 32
LED                    → GPIO 13
Buzzer                 → GPIO 27
GPS TX → ESP32 RX      → GPIO 16
GPS RX ← ESP32 TX      → GPIO 17
```

## 4. Software requirements

- Node.js ≥ 18 and npm
- The DriveSafe ESP32 firmware exposing the telemetry endpoint (below)
- A modern browser (Chrome / Edge / Firefox / Safari, desktop or mobile)

## 5. Installation

```bash
npm install
npm run dev        # local development server
npm run build      # production build (single-file dist/index.html)
```

## 6. Running the web application

`npm run dev` serves the app locally. Open **Settings → Data Source**:

- **Demo Mode ON (default):** a simulated vehicle drives immediately — no hardware needed.
  Inject events with the amber *DEMO MODE* strip on the dashboard.
- **Demo Mode OFF:** the app polls the ESP32 and reconnects automatically if the link drops.

## 7. ESP32 connection

### Quick start

1. **Flash the firmware** — open `src/esp32/drivesafe_v2.1/drivesafe_v2.1.ino` in the Arduino IDE or PlatformIO and upload it to your ESP32
2. **Connect to Wi-Fi** — on your phone/laptop, join the `DriveSafe` network (password `12345678`)
3. **Open the dashboard** — visit `http://192.168.4.1` in a browser, or run the web app locally with `npm run dev`
4. **In Settings → Data Source**, set the endpoint to `http://192.168.4.1` and turn **Demo Mode OFF**
5. Click **Test connection** — you should see "✓ Reachable"

### Firmware endpoints

| Method | Path | Content-Type | Purpose |
|---|---|---|---|
| `GET` | `/` | `text/html` | Legacy HTML status page |
| `GET` | `/telemetry` | `application/json` | Live telemetry JSON (polled by dashboard) |
| `GET` | `/status` | `application/json` | Alias for `/telemetry` |
| `POST` | `/command` | `application/json` | Trip control: `{"cmd":"trip_start"}` or `{"cmd":"trip_stop"}` |

All JSON endpoints send CORS headers (`Access-Control-Allow-Origin: *`) so the dashboard can connect from any origin.

### CORS note

If you access the dashboard from a different machine than the ESP32 (e.g. laptop → ESP32), the browser enforces same-origin policy. The firmware includes CORS headers, but some browsers may still block the first request. If you see "RECONNECTING", open `http://192.168.4.1/telemetry` directly in a tab first — this "primes" the CORS preflight for that origin.

## 8. API format

```json
{
  "tripRunning": true,
  "speed": 42.5,
  "latitude": 11.084199,
  "longitude": 77.191265,
  "gpsFix": true,
  "satellites": 7,
  "accuracy": 4.2,
  "heading": 87,
  "event": "HARSH BRAKE",
  "driverScore": 94,
  "ax": 1.2, "ay": 0.2, "az": 0.98,
  "gx": 4.2, "gy": 2.1, "gz": 1.3,
  "mpuOk": true, "oledOk": true, "buzzer": "TRIPLE BEEP"
}
```

All fields are optional and **validated client-side**: numbers are range-clamped, coordinates
outside valid ranges drop to "no fix", and `event` must match a fixed whitelist
(`HARSH ACCELERATION`, `HARSH BRAKING`, `LEFT TURN`, `RIGHT TURN`, `OVERSPEED`, `ACCIDENT`, …).
Device strings are never rendered as HTML. `mpuOk / oledOk / buzzer` are display-only and shown
only when present.

The data source lives in `src/lib/api.ts` (`Esp32Source` / `DemoSource` behind `TelemetrySource`)
— swap polling for WebSockets/MQTT without touching UI code.

## 9. GPS integration

GPS speed, fix, satellite count and position are taken directly from each packet — nothing is
hard-coded. Distance is accumulated with the haversine formula between successive fixes
(> 4 m apart, speed > 1.5 km/h to reject stationary jitter). Without a fix the map shows
*GPS SIGNAL LOST — Waiting for GPS fix…* while coordinates/Google-Maps links keep working.

## 10. MPU6050 integration

`ax/ay/az` (g) and `gx/gy/gz` (°/s) feed two live Chart.js graphs with a capped rolling window
(60 visible samples) so memory stays flat. If the inertial data is missing or non-finite the
section shows *Sensor data unavailable*.

## 11. Event detection

Events reported by the firmware are logged with severity and score impact:

| Event | Severity | Score |
|---|---|---|
| Harsh acceleration | Medium | −2 |
| Harsh braking | Medium | −3 |
| Left / right turn | Low | −1 |
| Overspeed | High | −2 |
| Accident | Critical | −25 |

A client-side fallback flags **overspeed** from the configurable speed limit even if the firmware
doesn't emit it. Speed zones: `0 … limit−10` SAFE, `limit−10 … limit` CAUTION, `> limit` OVERSPEED.
If the packet carries no `driverScore`, the dashboard maintains its own score from 100.

## 12. Google Maps integration

Whenever a valid fix exists the button builds the URL dynamically and opens it in a new tab:

```
https://maps.google.com/?q=<latitude>,<longitude>
```

The accident overlay adds **Copy location** and (on supporting devices) native **Share**.
DriveSafe never contacts emergency services automatically.

## 13. Demo mode

Demo Mode runs `src/lib/demo.ts`, a driving-physics simulator that emits the *exact* packet shape
of the real firmware (tagged `source: "demo"`). It auto-drives scenarios and lets you inject any
event with one tap for a safe demonstration. Hazards-striped banners, `DEMO` badges on events,
trips and toasts, and a `SIMULATED` link status make it impossible to confuse with real data.

## 14. Troubleshooting

| Symptom | Fix |
|---|---|
| “RECONNECTING” forever | Confirm the ESP32 web server is up, you're on its Wi-Fi network, and CORS (`Access-Control-Allow-Origin: *`) is set. Use *Test connection*. |
| Dashboard empty in real mode | Verify `GET /telemetry` returns the JSON format above (open it directly in a tab). |
| Start/Stop fails on hardware | `POST /command` is optional; the physical button on GPIO 32 always works. |
| No map tiles | Offline/blocked tile server — coordinates + Google Maps link still function. |
| Notifications don't appear | Re-enable the toggle in Settings to trigger the permission prompt; browsers block it otherwise. |
| Stale demo coordinates | Change *Demo origin lat/lng* in Settings. |

## 15. Future improvements

- WebSocket push instead of polling; TLS + token auth for the ESP32 endpoint
- Cloud sync / fleet view, Geofencing, OBD-II fusion
- Server-side trip storage, crash-file export (pre-crash sensor buffer), SMS emergency opt-in
- Progressive Web App install + offline tile caching
