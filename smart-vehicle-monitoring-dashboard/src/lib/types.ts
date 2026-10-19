/** Core domain types for the DriveSafe black-box dashboard. */

export type EventKind =
  | "NORMAL"
  | "HARSH_ACCEL"
  | "HARSH_BRAKE"
  | "LEFT_TURN"
  | "RIGHT_TURN"
  | "OVERSPEED"
  | "ACCIDENT";

export type Severity = "Info" | "Low" | "Medium" | "High" | "Critical";

/** A single validated telemetry packet, regardless of source. */
export interface TelemetryPacket {
  ts: number;
  source: "esp32" | "demo";
  tripRunning: boolean;
  speed: number; // km/h (GPS-derived)
  latitude: number | null;
  longitude: number | null;
  gpsFix: boolean;
  satellites: number;
  accuracy: number | null; // metres, when reported
  heading: number | null; // degrees, when derivable
  event: EventKind;
  driverScore: number | null; // null → dashboard computes locally
  ax: number | null;
  ay: number | null;
  az: number | null;
  gx: number | null;
  gy: number | null;
  gz: number | null;
  /** Optional hardware flags — only shown when actually reported. */
  mpuOk?: boolean;
  oledOk?: boolean;
  buzzerState?: string;
}

export interface DriveEvent {
  id: string;
  ts: number;
  kind: EventKind;
  speed: number;
  lat: number | null;
  lng: number | null;
  severity: Severity;
  scoreImpact: number;
  demo: boolean;
}

export interface TripRecord {
  id: string;
  startedAt: number;
  endedAt: number;
  distanceKm: number;
  maxSpeed: number;
  avgSpeed: number;
  score: number;
  counts: Record<string, number>;
  speedProfile: number[]; // sampled every few seconds
  demo: boolean;
}

export interface ScoreReason {
  ts: number;
  kind: EventKind;
  impact: number;
}

export interface AccidentRecord {
  ts: number;
  speed: number;
  peakG: number;
  lat: number | null;
  lng: number | null;
  satellites: number;
  gpsFix: boolean;
  demo: boolean;
}

export interface Settings {
  speedLimit: number;
  harshAccel: number; // g
  harshBrake: number; // g (negative)
  accidentG: number; // g
  theme: "dark" | "light";
  autoRefresh: boolean;
  mapTracking: boolean;
  sound: boolean;
  notifications: boolean;
  demoMode: boolean;
  demoOriginLat: number;
  demoOriginLng: number;
  endpoint: string; // ESP32 base URL, e.g. http://192.168.4.1
  pollMs: number;
}

export type ViewId = "dashboard" | "map" | "analytics" | "events" | "trips" | "settings";

export interface Toast {
  id: string;
  title: string;
  body: string;
  tone: "info" | "warn" | "danger" | "ok";
}
