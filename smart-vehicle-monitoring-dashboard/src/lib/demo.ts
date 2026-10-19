import type { EventKind, Settings } from "./types";

/**
 * DemoSimulator — a clearly-labelled driving scenario generator used ONLY
 * when Demo Mode is enabled. It emits the exact same packet shape the real
 * ESP32 firmware sends, so the dashboard code path is identical.
 * Packets are tagged `source: "demo"` end-to-end.
 */
type Mode = "IDLE" | "CRUISE" | "ACCEL" | "BRAKE" | "TURN_L" | "TURN_R" | "OVERSPEED" | "ACCIDENT";

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export class DemoSimulator {
  private timer: ReturnType<typeof setInterval> | null = null;
  private onPacket: (raw: Record<string, unknown>) => void;

  private mode: Mode = "CRUISE";
  private modeUntil = 0;
  private speed = 0; // km/h
  private target = 34;
  private heading = 38; // deg
  private lat: number;
  private lng: number;
  private tripRunning = true;
  private score = 100;
  private lastCleanBonus = Date.now();
  private lastOverspeedPing = 0;
  private autoScenario = true;
  private nextScenario = Date.now() + 9000;
  private paused = false;
  private settings: Pick<Settings, "speedLimit" | "harshAccel" | "harshBrake" | "accidentG">;

  constructor(settings: Settings, onPacket: (raw: Record<string, unknown>) => void) {
    this.onPacket = onPacket;
    this.lat = settings.demoOriginLat;
    this.lng = settings.demoOriginLng;
    this.settings = settings;
  }

  start(intervalMs: number) {
    this.stop();
    const dt = Math.max(300, intervalMs) / 1000;
    this.timer = setInterval(() => this.tick(dt), Math.max(300, intervalMs));
    this.tick(dt);
  }
  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
  setPaused(p: boolean) {
    this.paused = p;
  }
  updateSettings(s: Settings) {
    this.settings = s;
  }
  setTrip(running: boolean) {
    this.tripRunning = running;
    if (running) {
      this.score = 100;
      this.mode = "CRUISE";
      this.speed = 0;
    } else {
      this.mode = "IDLE";
      this.target = 0;
    }
  }
  isAccidentLatched() {
    return this.mode === "ACCIDENT";
  }
  resumeAfterAccident() {
    this.mode = "CRUISE";
    this.modeUntil = 0;
    this.target = rnd(24, 38);
  }

  /** Manually inject a scenario — used by the Demo control strip. */
  inject(kind: EventKind) {
    const now = Date.now();
    switch (kind) {
      case "HARSH_ACCEL": this.mode = "ACCEL"; this.modeUntil = now + 3600; this.target = 58; break;
      case "HARSH_BRAKE": this.mode = "BRAKE"; this.modeUntil = now + 3000; this.target = 6; break;
      case "LEFT_TURN": this.mode = "TURN_L"; this.modeUntil = now + 3400; break;
      case "RIGHT_TURN": this.mode = "TURN_R"; this.modeUntil = now + 3400; break;
      case "OVERSPEED": this.mode = "OVERSPEED"; this.modeUntil = now + 8000; this.target = this.settings.speedLimit + 14; break;
      case "ACCIDENT": this.mode = "ACCIDENT"; this.modeUntil = Infinity; break;
      default: this.mode = "CRUISE"; this.modeUntil = 0;
    }
  }

  private tick(dt: number) {
    if (this.paused) return;
    const now = Date.now();
    const s = this.settings;

    /* mode lifecycle */
    if (this.mode !== "ACCIDENT" && now > this.modeUntil && this.mode !== "CRUISE" && this.mode !== "IDLE") {
      this.mode = this.tripRunning ? "CRUISE" : "IDLE";
    }
    if (this.autoScenario && this.tripRunning && this.mode === "CRUISE" && now > this.nextScenario) {
      const pool: EventKind[] = ["HARSH_ACCEL", "HARSH_BRAKE", "LEFT_TURN", "RIGHT_TURN", "OVERSPEED"];
      this.inject(pool[Math.floor(Math.random() * pool.length)]);
      this.nextScenario = now + rnd(14000, 26000);
    }
    if (this.mode === "CRUISE") this.target = clamp(this.target + rnd(-3, 3), 22, 46);

    /* speed physics */
    const prevSpeed = this.speed;
    let accelG = 0;
    if (this.mode === "ACCIDENT") {
      this.speed = Math.max(0, this.speed - 90 * dt);
      accelG = this.speed > 1 ? -s.accidentG - rnd(0, 0.4) : 0;
    } else if (this.tripRunning) {
      const rate = this.mode === "ACCEL" ? 22 : this.mode === "BRAKE" ? -30 : this.mode === "OVERSPEED" ? 14 : 7;
      const delta = clamp(this.target - this.speed, rate * dt * -1, rate * dt);
      this.speed = clamp(this.speed + delta + rnd(-0.6, 0.6), 0, 140);
      accelG = (this.speed - prevSpeed) / dt / 9.81 * 2.6; // scale to feel like longitudinal g
    } else {
      this.speed = Math.max(0, this.speed - 20 * dt);
    }

    /* heading + position */
    let gz = rnd(-2.2, 2.2);
    if (this.mode === "TURN_L") { gz = -rnd(28, 55); this.heading -= (40 * dt); this.speed = Math.max(12, this.speed - 6 * dt); }
    if (this.mode === "TURN_R") { gz = rnd(28, 55); this.heading += (40 * dt); this.speed = Math.max(12, this.speed - 6 * dt); }
    if (this.mode === "CRUISE" || this.mode === "OVERSPEED") this.heading += rnd(-3, 3) * dt * 4;
    this.heading = (this.heading + 360) % 360;

    if (this.tripRunning && this.speed > 0.5) {
      const dKm = (this.speed * dt) / 3600;
      this.lat += (dKm / 110.574) * Math.cos((this.heading * Math.PI) / 180);
      this.lng += (dKm / (111.32 * Math.cos((this.lat * Math.PI) / 180))) * Math.sin((this.heading * Math.PI) / 180);
    }

    /* scoring */
    let event: EventKind = "NORMAL";
    if (this.mode === "ACCEL") event = "HARSH_ACCEL";
    else if (this.mode === "BRAKE") event = "HARSH_BRAKE";
    else if (this.mode === "TURN_L") event = "LEFT_TURN";
    else if (this.mode === "TURN_R") event = "RIGHT_TURN";
    else if (this.mode === "ACCIDENT") event = "ACCIDENT";
    else if (this.speed > s.speedLimit && now - this.lastOverspeedPing > 6000) {
      event = "OVERSPEED";
      this.lastOverspeedPing = now;
    }
    if (this.speed > s.speedLimit && this.mode !== "OVERSPEED" && this.mode !== "ACCIDENT") event = "OVERSPEED";

    if (now - this.lastCleanBonus > 25000 && event === "NORMAL" && this.tripRunning) {
      this.score = clamp(this.score + 1, 0, 100);
      this.lastCleanBonus = now;
    }

    const lateralG = Math.abs(gz) > 10 ? rnd(0.2, 0.5) * Math.sign(gz) : rnd(-0.05, 0.05);
    this.onPacket({
      tripRunning: this.tripRunning,
      speed: +this.speed.toFixed(1),
      latitude: +this.lat.toFixed(6),
      longitude: +this.lng.toFixed(6),
      gpsFix: true,
      satellites: Math.round(clamp(7 + rnd(-1.6, 1.8), 4, 11)),
      accuracy: +rnd(2.5, 7.5).toFixed(1),
      heading: Math.round(this.heading),
      event,
      driverScore: Math.round(this.score),
      ax: +clamp(accelG + rnd(-0.06, 0.06), -8, 8).toFixed(2),
      ay: +lateralG.toFixed(2),
      az: +(1 + rnd(-0.04, 0.04)).toFixed(2),
      gx: +rnd(-3, 3).toFixed(1),
      gy: +rnd(-2, 2).toFixed(1),
      gz: +gz.toFixed(1),
      mpuOk: true,
      oledOk: true,
      buzzer:
        event === "ACCIDENT" ? "EMERGENCY PATTERN" :
        event === "OVERSPEED" || event === "HARSH_BRAKE" || event === "HARSH_ACCEL" ? "TRIPLE BEEP" :
        event === "NORMAL" ? "READY" : "SHORT BEEP",
    });
  }

  /** Local score adjustment hook — the store tells the sim what it deducted. */
  applyPenalty(p: number) {
    this.score = clamp(this.score + p, 0, 100);
  }
}
