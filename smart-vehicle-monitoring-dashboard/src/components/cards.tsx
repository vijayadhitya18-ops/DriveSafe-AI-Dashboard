import type { ReactNode } from "react";
import { useDrive, useNow, store } from "../lib/store";
import type { EventKind } from "../lib/types";
import { EVENT_META, fmtClock, fmtCoord, fmtDuration, fmtKm, timeAgo } from "../lib/utils";
import {
  IconBolt, IconBrake, IconCar, IconCheck, IconChip, IconGauge, IconPlay, IconPulse,
  IconSatellite, IconSound, IconStop, IconTurnLeft, IconTurnRight, IconWarning, IconWifi,
} from "./icons";

/* ───────────────────────── Trip status ───────────────────────── */
export function TripCard() {
  const s = useDrive();
  useNow(1000);
  const running = s.tripRunning;
  const p = s.packet;
  const duration = running && s.tripStartedAt ? Date.now() - s.tripStartedAt : 0;

  return (
    <section className="card relative overflow-hidden p-5 rise-in" aria-label="Trip status">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="card-title">TRIP STATUS</h2>
          <div className="mt-3 flex items-center gap-2.5">
            <span className={`dot h-3 w-3 ${running ? "dot-live" : ""}`} style={{ color: running ? "var(--green)" : "var(--dim)" }} />
            <span className="font-display text-2xl font-bold tracking-wide" style={{ color: running ? "var(--green)" : "var(--muted)" }}>
              {running ? "RUNNING" : "STOPPED"}
            </span>
            {p?.source === "demo" && running && (
              <span className="pill !text-[9px]" style={{ color: "var(--amber)", borderColor: "var(--amber)" }}>SIM</span>
            )}
          </div>
        </div>
        <button
          className={`btn ${running ? "btn-red" : "btn-green"}`}
          onClick={() => void store.setTrip(!running)}
          aria-label={running ? "Stop trip" : "Start trip"}
        >
          {running ? <IconStop size={14} /> : <IconPlay size={14} />}
          {running ? "Stop Trip" : "Start Trip"}
        </button>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-5">
        <Stat label="STARTED" value={s.tripStartedAt ? fmtClock(s.tripStartedAt) : "——"} />
        <Stat label="DURATION" value={running ? fmtDuration(duration) : "00:00:00"} mono />
        <Stat label="DISTANCE" value={running || s.tripDistanceKm > 0 ? fmtKm(s.tripDistanceKm) : "——"} mono />
        <Stat label="CURRENT" value={p ? `${p.speed.toFixed(1)} km/h` : "——"} mono accent="var(--cyan)" />
        <Stat label="MAX SPEED" value={s.tripMaxSpeed > 0 ? `${s.tripMaxSpeed.toFixed(0)} km/h` : "——"} mono />
      </dl>
    </section>
  );
}

export function Stat({ label, value, mono, accent }: { label: string; value: ReactNode; mono?: boolean; accent?: string }) {
  return (
    <div>
      <dt className="font-display text-[9.5px] font-semibold tracking-[0.18em] text-[var(--dim)]">{label}</dt>
      <dd className={`mt-0.5 text-[15px] font-semibold text-[var(--text)] ${mono ? "num" : ""}`} style={accent ? { color: accent } : undefined}>
        {value}
      </dd>
    </div>
  );
}

/* ───────────────────────── Current event banner ───────────────────────── */
const EVENT_VIEW: Record<EventKind, { title: string; icon: ReactNode; color: string; critical?: boolean }> = {
  NORMAL: { title: "NORMAL DRIVING", icon: <IconCheck size={26} />, color: "var(--green)" },
  HARSH_ACCEL: { title: "HARSH ACCELERATION", icon: <IconBolt size={26} />, color: "var(--amber)" },
  HARSH_BRAKE: { title: "HARSH BRAKING", icon: <IconBrake size={26} />, color: "var(--amber)" },
  LEFT_TURN: { title: "LEFT TURN", icon: <IconTurnLeft size={26} />, color: "var(--cyan)" },
  RIGHT_TURN: { title: "RIGHT TURN", icon: <IconTurnRight size={26} />, color: "var(--cyan)" },
  OVERSPEED: { title: "OVERSPEED", icon: <IconGauge size={26} />, color: "var(--red)" },
  ACCIDENT: { title: "ACCIDENT DETECTED", icon: <IconWarning size={26} />, color: "var(--red)", critical: true },
};

export function EventBanner() {
  const s = useDrive();
  const kind: EventKind = s.packet?.event ?? "NORMAL";
  const view = EVENT_VIEW[kind];
  const sev = EVENT_META[kind];

  return (
    <section
      className={`card relative overflow-hidden p-5 rise-in ${view.critical ? "flash-critical alarm-sweep" : ""}`}
      aria-live="assertive"
      aria-label={`Current event: ${view.title}`}
    >
      <h2 className="card-title">CURRENT EVENT</h2>
      <div className="mt-3 flex items-center gap-4">
        <div
          className={`flex h-14 w-14 flex-none items-center justify-center rounded-xl border ${kind !== "NORMAL" ? "blink-soft" : ""}`}
          style={{ color: view.color, borderColor: view.color, background: "color-mix(in srgb, currentColor 10%, transparent)" }}
        >
          {view.icon}
        </div>
        <div className="min-w-0">
          <p className="font-display text-xl font-bold leading-tight sm:text-2xl" style={{ color: view.color }}>
            {view.critical ? "🚨 " : kind !== "NORMAL" ? "⚠ " : "✓ "}
            {view.title}
          </p>
          <p className="mt-0.5 text-[12.5px] text-[var(--muted)]">
            {kind === "NORMAL"
              ? "All vehicle parameters within safe range."
              : `Severity ${sev.severity} · score impact ${sev.impact} · ${s.packet ? fmtClock(s.packet.ts) : ""}`}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="pill" style={{ color: view.color, borderColor: view.color }}>
          {s.packet ? `${s.packet.speed.toFixed(0)} KM/H` : "—"}
        </span>
        {view.critical && s.accident && s.accident.gpsFix && (
          <span className="pill" style={{ color: "var(--cyan)", borderColor: "var(--cyan)" }}>
            GPS {fmtCoord(s.accident.lat)}, {fmtCoord(s.accident.lng)}
          </span>
        )}
      </div>
    </section>
  );
}

/* ───────────────────────── GPS status ───────────────────────── */
export function GpsCard() {
  const s = useDrive();
  const p = s.packet;
  const fix = p?.gpsFix ?? false;

  return (
    <section className="card p-5 rise-in" aria-label="GPS status">
      <div className="flex items-center justify-between">
        <h2 className="card-title">GPS STATUS</h2>
        <span className="pill" style={fix ? { color: "var(--green)", borderColor: "var(--green)" } : { color: "var(--amber)", borderColor: "var(--amber)" }}>
          <span className={`dot ${fix ? "dot-live" : "blink-soft"}`} /> {fix ? "FIXED" : p ? "NO GPS FIX" : "STANDBY"}
        </span>
      </div>

      {!p ? (
        <p className="mt-4 text-[13px] text-[var(--dim)]">Waiting for first telemetry packet…</p>
      ) : !fix ? (
        <div className="mt-4">
          <p className="font-display text-sm font-semibold text-[var(--amber)]">GPS SIGNAL LOST</p>
          <p className="mt-1 text-[12.5px] text-[var(--muted)]">
            {p.satellites > 0 ? `${p.satellites} satellites in view — ` : ""}Waiting for satellite signal…
          </p>
        </div>
      ) : (
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
          <Stat label="SATELLITES" value={
            <span className="flex items-center gap-1.5">
              <IconSatellite size={14} className="text-[var(--cyan)]" />{p.satellites}
            </span>
          } />
          <Stat label="GPS SPEED" value={`${p.speed.toFixed(2)} km/h`} mono />
          <Stat label="LATITUDE" value={fmtCoord(p.latitude)} mono />
          <Stat label="LONGITUDE" value={fmtCoord(p.longitude)} mono />
          {p.accuracy !== null && <Stat label="ACCURACY" value={`± ${p.accuracy.toFixed(0)} m`} mono />}
          {p.heading !== null && <Stat label="HEADING" value={`${p.heading.toFixed(0)}°`} mono />}
        </dl>
      )}
    </section>
  );
}

/* ───────────────────────── Buzzer mirror ───────────────────────── */
export function BuzzerCard() {
  const s = useDrive();
  const state = s.packet?.buzzerState;
  const kind = s.packet?.event ?? "NORMAL";
  const active = kind !== "NORMAL";

  return (
    <section className="card p-5 rise-in" aria-label="Buzzer status">
      <div className="flex items-center justify-between">
        <h2 className="card-title">BUZZER · GPIO 27</h2>
        <span className="pill" style={active ? { color: "var(--red)", borderColor: "var(--red)" } : { color: "var(--green)", borderColor: "var(--green)" }}>
          <IconSound size={12} />
          {active ? "🔊 WARNING ACTIVE" : "● READY"}
        </span>
      </div>
      <p className="mt-3 text-[12.5px] text-[var(--muted)]">
        {state ? <>Firmware reports: <span className="font-semibold text-[var(--text)]">{state}</span></> : "Pattern shown mirrors the event severity class."}
      </p>
      <ul className="mt-3 space-y-1.5 text-[12px] text-[var(--dim)]">
        <li className={kind === "NORMAL" ? "text-[var(--green)]" : ""}>Normal — short beep</li>
        <li className={["HARSH_ACCEL", "HARSH_BRAKE", "OVERSPEED"].includes(kind) ? "text-[var(--amber)]" : ""}>Warning — triple beep</li>
        <li className={kind === "ACCIDENT" ? "text-[var(--red)]" : ""}>Critical — emergency pattern</li>
      </ul>
    </section>
  );
}

/* ───────────────────────── Hardware / connection panel ───────────────────────── */
export function ConnectionPanel() {
  const s = useDrive();
  useNow(1000);
  const p = s.packet;
  const espOk = s.linkOk && s.lastUpdate > 0;
  const mpuOk = p?.mpuOk ?? (p ? [p.ax, p.ay, p.az, p.gx, p.gy, p.gz].some((v) => v !== null) : false);

  const rows: { icon: ReactNode; label: string; value: string; tone: string; note?: string }[] = [
    {
      icon: <IconChip size={15} />, label: "ESP32",
      value: s.source === "demo" ? "SIMULATED" : espOk ? "CONNECTED" : s.lastUpdate === 0 ? "CONNECTING" : "RECONNECTING",
      tone: s.source === "demo" ? "var(--amber)" : espOk ? "var(--green)" : "var(--red)",
      note: s.lastUpdate > 0 ? `Last update ${timeAgo(s.lastUpdate)}` : s.source === "demo" ? "Demo simulator active" : "Trying to reconnect…",
    },
    {
      icon: <IconSatellite size={15} />, label: "GPS",
      value: !p ? "STANDBY" : p.gpsFix ? "FIXED" : "NO FIX",
      tone: !p ? "var(--dim)" : p.gpsFix ? "var(--green)" : "var(--amber)",
      note: p?.gpsFix ? `${p.satellites} satellites` : "Acquiring signal",
    },
    {
      icon: <IconPulse size={15} />, label: "MPU6050",
      value: !p ? "STANDBY" : mpuOk ? "STREAMING" : "NO DATA",
      tone: !p ? "var(--dim)" : mpuOk ? "var(--green)" : "var(--red)",
      note: mpuOk ? "Accel + gyro valid" : "Sensor data unavailable",
    },
  ];
  if (p?.oledOk !== undefined) {
    rows.push({ icon: <IconGauge size={15} />, label: "OLED", value: p.oledOk ? "ACTIVE" : "FAULT", tone: p.oledOk ? "var(--green)" : "var(--red)" });
  }
  if (p?.buzzerState !== undefined) {
    rows.push({ icon: <IconSound size={15} />, label: "BUZZER", value: p.buzzerState, tone: p.buzzerState === "READY" ? "var(--green)" : "var(--amber)" });
  }

  return (
    <section className="card p-5 rise-in" aria-label="Connection status">
      <h2 className="card-title">CONNECTION</h2>
      <ul className="mt-4 space-y-3">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2.5 text-[13px] text-[var(--muted)]">
              <span style={{ color: r.tone }}>{r.icon}</span>
              <span className="font-display font-semibold tracking-wider text-[var(--text)]">{r.label}</span>
            </span>
            <span className="text-right">
              <span className="pill" style={{ color: r.tone, borderColor: r.tone }} role="status">
                <span className={`dot ${r.tone !== "var(--dim)" ? "dot-live" : ""}`} /> {r.value}
              </span>
              {r.note && <span className="mt-0.5 block text-[10.5px] text-[var(--dim)]">{r.note}</span>}
            </span>
          </li>
        ))}
      </ul>
      {s.source === "esp32" && !espOk && (
        <p className="mt-4 rounded-lg border border-[var(--line)] bg-[var(--bg1)] p-2.5 text-[11.5px] text-[var(--amber)]">
          <IconWifi size={12} className="mr-1 inline" />
          ESP32 CONNECTION LOST — reconnecting to {s.settings.endpoint}
        </p>
      )}
    </section>
  );
}

/* ───────────────────────── Demo control strip ───────────────────────── */
export function DemoStrip() {
  const s = useDrive();
  if (s.source !== "demo") return null;
  const inject = (k: EventKind) => store.injectDemo(k);
  const buttons: { k: EventKind; label: string }[] = [
    { k: "HARSH_ACCEL", label: "Harsh Accel" },
    { k: "HARSH_BRAKE", label: "Harsh Brake" },
    { k: "LEFT_TURN", label: "Left Turn" },
    { k: "RIGHT_TURN", label: "Right Turn" },
    { k: "OVERSPEED", label: "Overspeed" },
    { k: "ACCIDENT", label: "Accident" },
  ];
  return (
    <section className="card overflow-hidden rise-in" aria-label="Demo mode controls">
      <div className="hazard h-2" />
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-2.5">
          <IconCar size={18} className="text-[var(--amber)]" />
          <div>
            <p className="font-display text-[12px] font-bold tracking-[0.2em] text-[var(--amber)]">DEMO MODE — SIMULATED DATA</p>
            <p className="text-[11px] text-[var(--dim)]">Not connected to a vehicle. Inject scenarios for a safe demonstration.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {buttons.map((b) => (
            <button
              key={b.k}
              className="btn !px-2.5 !py-1.5 !text-[10.5px]"
              style={b.k === "ACCIDENT" ? { color: "var(--red)", borderColor: "var(--red)" } : undefined}
              onClick={() => inject(b.k)}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
