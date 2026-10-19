import type { Settings } from "./types";
import { DemoSimulator } from "./demo";

/**
 * API layer between the dashboard and the data source.
 *
 * REAL MODE  → Esp32Source polls `GET {endpoint}/telemetry` (JSON) and can
 *              send `POST {endpoint}/command` {"cmd":"trip_start"|"trip_stop"}.
 *              Swap this class to move to WebSockets/MQTT without touching
 *              any UI code.
 * DEMO MODE  → DemoSimulator emits identical packet shapes, tagged "demo".
 */
export interface TelemetrySource {
  readonly kind: "esp32" | "demo";
  start(): void;
  stop(): void;
  setPaused(paused: boolean): void;
  setTrip(running: boolean): Promise<boolean>;
  resumeAfterAccident(): void;
  inject?(kind: string): void;
  sim?: DemoSimulator;
}

export class Esp32Source implements TelemetrySource {
  readonly kind = "esp32" as const;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private paused = false;
  private stopped = false;
  private failures = 0;
  private triedStatus = false;

  constructor(
    private endpoint: string,
    private pollMs: number,
    private onPacket: (raw: unknown) => void,
    private onLink: (ok: boolean) => void
  ) {}

  start() {
    this.stopped = false;
    this.triedStatus = false;
    this.schedule(0);
  }
  stop() {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }
  setPaused(p: boolean) {
    this.paused = p;
    if (!p) this.schedule(0);
  }

  private schedule(delay: number) {
    if (this.stopped) return;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.poll(), delay);
  }

  private async poll() {
    if (this.stopped) return;
    if (this.paused) return;
    const base = this.endpoint.replace(/\/$/, "");
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), Math.min(3000, this.pollMs * 2));
    try {
      // First try the JSON telemetry endpoint (recommended)
      let res = await fetch(`${base}/telemetry`, {
        signal: ctrl.signal,
        cache: "no-store",
      });
      // Fallback: the original firmware serves JSON at GET /status
      if (!res.ok && !this.triedStatus) {
        this.triedStatus = true;
        res = await fetch(`${base}/status`, { signal: ctrl.signal, cache: "no-store" });
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      this.failures = 0;
      this.onLink(true);
      this.onPacket(json);
    } catch {
      this.failures += 1;
      this.onLink(false);
    } finally {
      clearTimeout(timeout);
    }
    const backoff = Math.min(8000, this.pollMs * Math.pow(1.6, Math.min(6, this.failures)));
    this.schedule(this.failures ? backoff : this.pollMs);
  }

  async setTrip(running: boolean): Promise<boolean> {
    try {
      const res = await fetch(`${this.endpoint.replace(/\/$/, "")}/command`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cmd: running ? "trip_start" : "trip_stop" }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  resumeAfterAccident() {
    /* firmware-managed; nothing to do client-side */
  }
}

export class DemoSource implements TelemetrySource {
  readonly kind = "demo" as const;
  sim: DemoSimulator;
  constructor(settings: Settings, onPacket: (raw: unknown) => void) {
    this.sim = new DemoSimulator(settings, onPacket);
  }
  start() {
    this.sim.start(700);
  }
  stop() {
    this.sim.stop();
  }
  setPaused(p: boolean) {
    this.sim.setPaused(p);
  }
  async setTrip(running: boolean) {
    this.sim.setTrip(running);
    return true;
  }
  resumeAfterAccident() {
    this.sim.resumeAfterAccident();
  }
  inject(kind: string) {
    this.sim.inject(kind as never);
  }
}
