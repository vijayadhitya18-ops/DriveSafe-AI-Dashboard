import type { EventKind, Settings, Severity, TelemetryPacket } from "./types";

/* ───────────────────────── IDs & storage ───────────────────────── */
export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return { ...fallback, ...(JSON.parse(raw) as T) };
  } catch {
    return fallback;
  }
}
export function loadArray<T>(key: string, fallback: T[] = []): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const v = JSON.parse(raw);
    return Array.isArray(v) ? (v as T[]) : fallback;
  } catch {
    return fallback;
  }
}
export function saveJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full / private mode — non-fatal */
  }
}

export const DEFAULT_SETTINGS: Settings = {
  speedLimit: 60,
  harshAccel: 1.8,
  harshBrake: -1.8,
  accidentG: 3.0,
  theme: "dark",
  autoRefresh: true,
  mapTracking: true,
  sound: true,
  notifications: false,
  demoMode: true,
  demoOriginLat: 11.0842,
  demoOriginLng: 77.1913,
  endpoint: "http://192.168.4.1",
  pollMs: 1000,
};

/* ───────────────────────── Event metadata ───────────────────────── */
export const EVENT_META: Record<
  EventKind,
  { label: string; severity: Severity; impact: number; group: string }
> = {
  NORMAL: { label: "Normal", severity: "Info", impact: 0, group: "normal" },
  HARSH_ACCEL: { label: "Harsh Acceleration", severity: "Medium", impact: -2, group: "acceleration" },
  HARSH_BRAKE: { label: "Harsh Braking", severity: "Medium", impact: -3, group: "braking" },
  LEFT_TURN: { label: "Left Turn", severity: "Low", impact: -1, group: "turning" },
  RIGHT_TURN: { label: "Right Turn", severity: "Low", impact: -1, group: "turning" },
  OVERSPEED: { label: "Overspeed", severity: "High", impact: -2, group: "overspeed" },
  ACCIDENT: { label: "Accident", severity: "Critical", impact: -25, group: "accident" },
};

const EVENT_ALIASES: Record<string, EventKind> = {
  NORMAL: "NORMAL",
  NONE: "NORMAL",
  OK: "NORMAL",
  READY: "NORMAL",
  "TRIP START": "NORMAL",
  "TRIP STOP": "NORMAL",
  "HARSH ACCELERATION": "HARSH_ACCEL",
  HARSH_ACCELERATION: "HARSH_ACCEL",
  "HARSH ACCEL": "HARSH_ACCEL",
  HARSH_ACCEL: "HARSH_ACCEL",
  ACCELERATION: "HARSH_ACCEL",
  "HARSH BRAKING": "HARSH_BRAKE",
  HARSH_BRAKE: "HARSH_BRAKE",
  BRAKING: "HARSH_BRAKE",
  "LEFT TURN": "LEFT_TURN",
  LEFT_TURN: "LEFT_TURN",
  "RIGHT TURN": "RIGHT_TURN",
  RIGHT_TURN: "RIGHT_TURN",
  OVERSPEED: "OVERSPEED",
  "OVER SPEED": "OVERSPEED",
  ACCIDENT: "ACCIDENT",
  CRASH: "ACCIDENT",
  COLLISION: "ACCIDENT",
};

/* ───────────────────────── Input validation ─────────────────────────
   Every byte coming from the ESP32 (or the simulator) passes through
   here. Numeric fields are coerced + range-clamped, the event string is
   matched against a fixed whitelist, coordinates outside the valid
   range are dropped to `null`. Strings are never rendered as HTML.   */
const num = (v: unknown, min: number, max: number, fb: number) => {
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fb;
};
const numOrNull = (v: unknown, min: number, max: number) => {
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
};

export function parsePacket(raw: unknown, source: "esp32" | "demo"): TelemetryPacket {
  const r = (raw ?? {}) as Record<string, unknown>;
  const lat = numOrNull(r.latitude ?? r.lat, -90, 90);
  const lng = numOrNull(r.longitude ?? r.lng ?? r.lon, -180, 180);
  const evRaw = (typeof r.event === "string" ? r.event : typeof r.eventName === "string" ? r.eventName : "NORMAL").trim().toUpperCase();
  return {
    ts: Date.now(),
    source,
    tripRunning: r.tripRunning === true || r.tripRunning === 1 || r.tripRunning === "true",
    speed: num(r.speed, 0, 300, 0),
    latitude: lat,
    longitude: lng,
    gpsFix: (r.gpsFix === true || r.gpsFix === 1) && lat !== null && lng !== null,
    satellites: Math.round(num(r.satellites ?? r.sats, 0, 40, 0)),
    accuracy: numOrNull(r.accuracy ?? r.hdop, 0, 500),
    heading: numOrNull(r.heading, 0, 360),
    event: EVENT_ALIASES[evRaw] ?? "NORMAL",
    driverScore: numOrNull(r.driverScore ?? r.score, 0, 100),
    ax: numOrNull(r.ax, -16, 16),
    ay: numOrNull(r.ay, -16, 16),
    az: numOrNull(r.az, -16, 16),
    gx: numOrNull(r.gx, -2000, 2000),
    gy: numOrNull(r.gy, -2000, 2000),
    gz: numOrNull(r.gz, -2000, 2000),
    mpuOk: typeof r.mpuOk === "boolean" ? r.mpuOk : undefined,
    oledOk: typeof r.oledOk === "boolean" ? r.oledOk : undefined,
    buzzerState: typeof r.buzzer === "string" ? r.buzzer.slice(0, 24) : undefined,
  };
}

/* ───────────────────────── Geo & formatting ───────────────────────── */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export const fmtCoord = (v: number | null) => (v === null ? "——" : v.toFixed(6));
export const fmtKm = (km: number) => (km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`);
export const fmtClock = (ts: number) =>
  new Date(ts).toLocaleTimeString([], { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
export const fmtTimeShort = (ts: number) =>
  new Date(ts).toLocaleTimeString([], { hour12: false, hour: "2-digit", minute: "2-digit" });
export const fmtDate = (ts: number) =>
  new Date(ts).toLocaleDateString([], { weekday: "short", day: "2-digit", month: "short", year: "numeric" });

export function fmtDuration(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(ss)}`;
}

export function timeAgo(ts: number) {
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 2) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
}

export const googleMapsUrl = (lat: number, lng: number) =>
  `https://maps.google.com/?q=${lat.toFixed(6)},${lng.toFixed(6)}`;

export function scoreBand(score: number) {
  if (score >= 90) return { label: "Excellent", color: "var(--green)" };
  if (score >= 75) return { label: "Good", color: "var(--cyan)" };
  if (score >= 50) return { label: "Moderate", color: "var(--amber)" };
  return { label: "Unsafe", color: "var(--red)" };
}

export function speedZone(speed: number, limit: number) {
  if (speed > limit) return { label: "OVERSPEED", color: "var(--red)", tone: "danger" as const };
  if (speed >= limit - 10) return { label: "CAUTION", color: "var(--amber)", tone: "warn" as const };
  return { label: "SAFE", color: "var(--green)", tone: "ok" as const };
}
