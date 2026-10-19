import { useSyncExternalStore } from "react";
import type {
  AccidentRecord, DriveEvent, ScoreReason, Settings, TelemetryPacket, Toast, TripRecord,
} from "./types";
import {
  DEFAULT_SETTINGS, EVENT_META, googleMapsUrl, haversineKm, loadArray, loadJSON, saveJSON, uid,
} from "./utils";
import { DemoSource, Esp32Source, type TelemetrySource } from "./api";
import { playPattern, setAudioEnabled, unlockAudio, type AlertPattern } from "./audio";

export interface Sample {
  t: number;
  ax: number | null; ay: number | null; az: number | null;
  gx: number | null; gy: number | null; gz: number | null;
}
export interface SpeedSample { t: number; v: number }

export interface DriveState {
  packet: TelemetryPacket | null;
  source: "esp32" | "demo" | "none";
  linkOk: boolean;
  lastUpdate: number;
  paused: boolean;

  tripRunning: boolean;
  tripStartedAt: number | null;
  tripDistanceKm: number;
  tripMaxSpeed: number;
  tripSpeedSamples: number;
  path: [number, number][];

  samples: Sample[];
  speedHistory: SpeedSample[];

  score: number;
  scoreReasons: ScoreReason[];

  events: DriveEvent[];
  trips: TripRecord[];
  accident: AccidentRecord | null;
  accidentOpen: boolean;
  summary: TripRecord | null;

  toasts: Toast[];
  settings: Settings;
}

const K = {
  settings: "drivesafe.settings.v1",
  events: "drivesafe.events.v1",
  trips: "drivesafe.trips.v1",
};

const patternFor = (kind: DriveEvent["kind"]): AlertPattern =>
  kind === "ACCIDENT" ? "emergency" :
  kind === "OVERSPEED" || kind === "HARSH_BRAKE" || kind === "HARSH_ACCEL" ? "triple" :
  kind === "NORMAL" ? "none" : "short";

class DriveStore {
  private listeners = new Set<() => void>();
  private source: TelemetrySource | null = null;
  private sourceKey = "";
  private lastEventAt: Partial<Record<string, number>> = {};
  private lastProfilePush = 0;
  private lastSpeedPush = 0;
  private booted = false;
  private speedProfile: number[] = [];

  state: DriveState = {
    packet: null,
    source: "none",
    linkOk: false,
    lastUpdate: 0,
    paused: false,
    tripRunning: false,
    tripStartedAt: null,
    tripDistanceKm: 0,
    tripMaxSpeed: 0,
    tripSpeedSamples: 0,
    path: [],
    samples: [],
    speedHistory: [],
    score: 100,
    scoreReasons: [],
    events: loadArray<DriveEvent>(K.events),
    trips: loadArray<TripRecord>(K.trips),
    accident: null,
    accidentOpen: false,
    summary: null,
    toasts: [],
    settings: loadJSON<Settings>(K.settings, DEFAULT_SETTINGS),
  };

  /* ───────────────────── React bindings ───────────────────── */
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };
  getSnapshot = () => this.state;

  private set(patch: Partial<DriveState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((fn) => fn());
  }

  toast(title: string, body: string, tone: Toast["tone"] = "info") {
    const t: Toast = { id: uid(), title, body, tone };
    this.set({ toasts: [...this.state.toasts.slice(-3), t] });
    setTimeout(() => this.dismissToast(t.id), 4600);
  }
  dismissToast(id: string) {
    this.set({ toasts: this.state.toasts.filter((t) => t.id !== id) });
  }

  /* ───────────────────── Lifecycle ───────────────────── */
  bootstrap() {
    if (this.booted) return;
    this.booted = true;
    setAudioEnabled(this.state.settings.sound);
    this.applyTheme(this.state.settings.theme);
    this.rebuildSource();
    setInterval(() => this.tick1s(), 1000);
    window.addEventListener("pointerdown", unlockAudio, { once: true });
    window.addEventListener("keydown", unlockAudio, { once: true });
  }

  private rebuildSource() {
    const s = this.state.settings;
    const key = `${s.demoMode ? "demo" : "esp32"}|${s.endpoint}|${s.pollMs}`;
    if (this.source && key === this.sourceKey) {
      this.source.setPaused(!s.autoRefresh);
      return;
    }
    this.source?.stop();
    this.sourceKey = key;
    if (s.demoMode) {
      const demo = new DemoSource(s, (raw) => this.ingest(raw, "demo"));
      demo.sim.updateSettings(s);
      this.source = demo;
    } else {
      this.source = new Esp32Source(
        s.endpoint,
        s.pollMs,
        (raw) => this.ingest(raw, "esp32"),
        (ok) => { if (ok !== this.state.linkOk) this.set({ linkOk: ok }); }
      );
    }
    this.set({ source: this.source.kind, linkOk: false, paused: !s.autoRefresh, lastUpdate: 0 });
    this.source.setPaused(!s.autoRefresh);
    this.source.start();
  }

  private tick1s() {
    const s = this.state;
    if (s.source === "esp32" && s.lastUpdate > 0) {
      const stale = Date.now() - s.lastUpdate > Math.max(4000, s.settings.pollMs * 3.5);
      if (stale && s.linkOk) this.set({ linkOk: false });
    }
    // gentle 1Hz re-render for clocks / "x seconds ago" labels
    this.listeners.forEach((fn) => fn());
  }

  /* ───────────────────── Ingestion ───────────────────── */
  private ingest(raw: unknown, src: "esp32" | "demo") {
    // Dynamic import-free path: parsePacket lives in utils
    const p = parse(raw, src);
    const prev = this.state.packet;
    const patch: Partial<DriveState> = { packet: p, lastUpdate: Date.now(), linkOk: true };

    /* trip edges */
    if (p.tripRunning && !this.state.tripRunning) {
      patch.tripRunning = true;
      patch.tripStartedAt = p.ts;
      patch.tripDistanceKm = 0;
      patch.tripMaxSpeed = 0;
      patch.tripSpeedSamples = 0;
      patch.path = [];
      patch.score = p.driverScore ?? 100;
      patch.scoreReasons = [];
      this.speedProfile = [];
      this.lastEventAt = {};
    } else if (!p.tripRunning && this.state.tripRunning) {
      patch.tripRunning = false;
      const rec = this.finishTrip(p.ts);
      if (rec) {
        patch.trips = [rec, ...this.state.trips].slice(0, 40);
        saveJSON(K.trips, patch.trips);
        patch.summary = rec;
      }
      patch.tripStartedAt = null;
    }

    /* position / distance (patch fields win right after a trip reset) */
    let path = patch.path ?? this.state.path;
    let dist = patch.tripDistanceKm ?? this.state.tripDistanceKm;
    if (patch.tripRunning || (p.tripRunning && this.state.tripRunning)) {
      if (p.gpsFix && p.speed > 1.5) {
        const last = path[path.length - 1];
        if (!last) {
          path = [[p.latitude!, p.longitude!] as [number, number]];
        } else {
          const d = haversineKm(last[0], last[1], p.latitude!, p.longitude!);
          if (d > 0.004) {
            path = [...path, [p.latitude!, p.longitude!] as [number, number]].slice(-6000);
            dist += d;
          }
        }
        patch.path = path;
        patch.tripDistanceKm = dist;
      }
      if (p.speed > this.state.tripMaxSpeed) patch.tripMaxSpeed = p.speed;
      if (p.ts - this.lastProfilePush > 2500) {
        this.lastProfilePush = p.ts;
        this.speedProfile = [...this.speedProfile, p.speed].slice(-1400);
        patch.tripSpeedSamples = this.speedProfile.length;
      }
    }

    /* sensor ring buffers */
    patch.samples = [
      ...this.state.samples,
      { t: p.ts, ax: p.ax, ay: p.ay, az: p.az, gx: p.gx, gy: p.gy, gz: p.gz },
    ].slice(-120);
    if (p.ts - this.lastSpeedPush > 1500) {
      this.lastSpeedPush = p.ts;
      patch.speedHistory = [...this.state.speedHistory, { t: p.ts, v: p.speed }].slice(-360);
    }

    /* driver score */
    const localScore = this.state.score;
    patch.score = p.driverScore ?? localScore;

    /* events */
    let eventKind = p.event;
    if (eventKind === "NORMAL" && p.speed > this.state.settings.speedLimit && p.tripRunning) {
      eventKind = "OVERSPEED"; // client-side fallback detection
    }
    if (eventKind !== "NORMAL") {
      const meta = EVENT_META[eventKind];
      const last = this.lastEventAt[eventKind] ?? 0;
      const cooldown = eventKind === "OVERSPEED" ? 8000 : eventKind === "ACCIDENT" ? 30000 : 5000;
      if (p.ts - last > cooldown) {
        this.lastEventAt[eventKind] = p.ts;
        const ev: DriveEvent = {
          id: uid(), ts: p.ts, kind: eventKind, speed: p.speed,
          lat: p.latitude, lng: p.longitude, severity: meta.severity,
          scoreImpact: meta.impact, demo: src === "demo",
        };
        patch.events = [ev, ...this.state.events].slice(0, 300);
        saveJSON(K.events, patch.events);
        patch.scoreReasons = [
          { ts: p.ts, kind: eventKind, impact: meta.impact },
          ...this.state.scoreReasons,
        ].slice(0, 30);
        if (p.driverScore == null) patch.score = Math.max(0, localScore + meta.impact);
        if (src === "demo") this.source?.sim?.applyPenalty(meta.impact);
        this.announce(ev);

        if (eventKind === "ACCIDENT") {
          patch.accident = {
            ts: p.ts, speed: p.speed,
            peakG: Math.max(Math.abs(p.ax ?? 0), Math.abs(p.ay ?? 0)),
            lat: p.latitude, lng: p.longitude,
            satellites: p.satellites, gpsFix: p.gpsFix, demo: src === "demo",
          };
          patch.accidentOpen = true;
        }
      }
    }

    this.set(patch);
    void prev;
  }

  private announce(ev: DriveEvent) {
    const meta = EVENT_META[ev.kind];
    const tone = ev.kind === "ACCIDENT" ? "danger" : meta.severity === "High" || meta.severity === "Critical" ? "danger" : meta.severity === "Info" ? "info" : "warn";
    this.toast(
      ev.kind === "ACCIDENT" ? "Accident detected" : meta.label,
      `${ev.speed.toFixed(0)} km/h · score ${ev.scoreImpact}`,
      tone
    );
    playPattern(patternFor(ev.kind));
    const s = this.state.settings;
    if (s.notifications && typeof Notification !== "undefined" && Notification.permission === "granted") {
      try {
        new Notification("DriveSafe", {
          body:
            ev.kind === "OVERSPEED" ? `Overspeed detected: ${ev.speed.toFixed(0)} km/h` :
            ev.kind === "ACCIDENT" ? "Accident detected." :
            `${meta.label} detected.`,
          tag: ev.kind,
        });
      } catch { /* non-fatal */ }
    }
  }

  private finishTrip(endedAt: number): TripRecord | null {
    const st = this.state;
    if (!st.tripStartedAt) return null;
    const ms = endedAt - st.tripStartedAt;
    const counts: Record<string, number> = {};
    const tripEvents = st.events.filter((e) => e.ts >= st.tripStartedAt!);
    tripEvents.forEach((e) => { counts[e.kind] = (counts[e.kind] ?? 0) + 1; });
    const avg = st.tripSpeedSamples > 0
      ? this.speedProfile.reduce((a, b) => a + b, 0) / this.speedProfile.length
      : 0;
    return {
      id: uid(),
      startedAt: st.tripStartedAt,
      endedAt,
      distanceKm: st.tripDistanceKm,
      maxSpeed: st.tripMaxSpeed,
      avgSpeed: avg,
      score: Math.round(st.packet?.driverScore ?? st.score),
      counts,
      speedProfile: this.speedProfile.slice(-360),
      demo: st.source === "demo",
    };
    void ms;
  }

  /* ───────────────────── Commands ───────────────────── */
  async setTrip(running: boolean) {
    const src = this.source;
    if (!src) return;
    const ok = await src.setTrip(running);
    if (ok) {
      if (src.kind === "demo") this.toast(running ? "Trip started" : "Trip stopped", "Demo simulator updated", "ok");
    } else {
      this.toast("Command failed", "Firmware did not accept trip command (is /command exposed?)", "warn");
    }
  }
  injectDemo(kind: string) {
    if (this.state.source === "demo") this.source?.inject?.(kind);
  }
  dismissAccident() {
    this.set({ accidentOpen: false });
    this.source?.resumeAfterAccident();
  }
  clearPath() {
    this.set({ path: [], tripDistanceKm: 0 });
    this.toast("Route cleared", "Live path memory reset", "info");
  }
  clearEvents() {
    this.set({ events: [] });
    saveJSON(K.events, []);
  }
  clearTrips() {
    this.set({ trips: [], summary: null });
    saveJSON(K.trips, []);
  }
  closeSummary() {
    this.set({ summary: null });
  }
  showSummary(rec: TripRecord) {
    this.set({ summary: rec });
  }

  /* ───────────────────── Settings ───────────────────── */
  updateSettings(patch: Partial<Settings>) {
    const settings = { ...this.state.settings, ...patch };
    saveJSON(K.settings, settings);
    this.set({ settings });
    if (patch.theme) this.applyTheme(patch.theme);
    if (patch.sound !== undefined) setAudioEnabled(patch.sound);
    if (patch.notifications && typeof Notification !== "undefined" && Notification.permission === "default") {
      void Notification.requestPermission().then((perm) => {
        if (perm !== "granted") this.toast("Notifications blocked", "Browser denied notification permission", "warn");
      });
    }
    this.source?.sim?.updateSettings(settings);
    if (patch.demoMode !== undefined || patch.endpoint !== undefined || patch.pollMs !== undefined) {
      this.sourceKey = ""; // force rebuild
      this.set({ packet: null, path: [], samples: [], tripRunning: false, tripStartedAt: null });
    }
    if (patch.autoRefresh !== undefined) this.set({ paused: !patch.autoRefresh });
    this.rebuildSource();
  }

  private applyTheme(theme: "dark" | "light") {
    document.documentElement.setAttribute("data-theme", theme);
  }
}

// tiny local parser binding (keeps import cycle-free)
import { parsePacket as parse } from "./utils";

export const store = new DriveStore();
export const useDrive = () => useSyncExternalStore(store.subscribe, store.getSnapshot);

/** 1 Hz clock hook for durations / "last update" labels. */
export function useNow(intervalMs = 1000) {
  return useSyncExternalStore(
    (fn) => {
      const t = setInterval(fn, intervalMs);
      return () => clearInterval(t);
    },
    () => Math.floor(Date.now() / intervalMs)
  );
}

export { googleMapsUrl };
