import { useState } from "react";
import { store, useDrive } from "../lib/store";
import type { Settings } from "../lib/types";
import { DEFAULT_SETTINGS } from "../lib/utils";
import { IconBell, IconCar, IconChip, IconGear, IconSatellite, IconShield, IconSound, IconTrash } from "../components/icons";

function Row({ title, desc, checked, onChange }: { title: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="text-[13.5px] font-semibold">{title}</p>
        <p className="text-[11.5px] text-[var(--dim)]">{desc}</p>
      </div>
      <button className="switch" role="switch" aria-checked={checked} aria-label={title} onClick={() => onChange(!checked)} />
    </div>
  );
}

function NumField({ label, unit, value, step, min, max, onChange }: {
  label: string; unit: string; value: number; step: number; min: number; max: number; onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="font-display text-[10px] font-semibold tracking-[0.18em] text-[var(--muted)]">{label}</span>
      <span className="mt-1.5 flex items-center gap-2">
        <input
          type="number" value={value} step={step} min={min} max={max}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (Number.isFinite(v)) onChange(Math.min(max, Math.max(min, v)));
          }}
          className="num w-24"
        />
        <span className="text-[12px] text-[var(--dim)]">{unit}</span>
      </span>
    </label>
  );
}

function Section({ icon, title, note, children }: { icon: React.ReactNode; title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="card p-5 rise-in">
      <div className="flex items-center gap-2.5">
        <span className="text-[var(--cyan)]">{icon}</span>
        <h2 className="card-title">{title}</h2>
      </div>
      {note && <p className="mt-2 text-[11.5px] leading-relaxed text-[var(--dim)]">{note}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function SettingsPage() {
  const s = useDrive();
  const st = s.settings;
  const set = (patch: Partial<Settings>) => store.updateSettings(patch);
  const [testState, setTestState] = useState<"idle" | "testing" | "ok" | "fail">("idle");

  const testConnection = async () => {
    setTestState("testing");
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 3000);
      const res = await fetch(`${st.endpoint.replace(/\/$/, "")}/telemetry`, { signal: ctrl.signal });
      clearTimeout(t);
      setTestState(res.ok ? "ok" : "fail");
    } catch {
      setTestState("fail");
    }
    setTimeout(() => setTestState("idle"), 4000);
  };

  const notifPerm = typeof Notification !== "undefined" ? Notification.permission : "unsupported";

  return (
    <div className="space-y-4">
      <h1 className="font-display flex items-center gap-2 text-lg font-bold tracking-wide">
        <IconGear size={18} className="text-[var(--cyan)]" /> SETTINGS
      </h1>

      <div className="grid gap-4 xl:grid-cols-2">
        {/* Data source */}
        <Section
          icon={<IconCar size={16} />}
          title="DATA SOURCE"
          note="Demo Mode runs an in-browser driving simulator tagged DEMO end-to-end. Turn it off to connect the real ESP32 black box over Wi-Fi."
        >
          <Row
            title="Demo Mode"
            desc="Simulated driving scenarios — clearly labelled, never mixed with real data."
            checked={st.demoMode}
            onChange={(v) => set({ demoMode: v })}
          />
          <Row
            title="Auto Refresh"
            desc="Continuously poll the data source. Disable to freeze the dashboard."
            checked={st.autoRefresh}
            onChange={(v) => set({ autoRefresh: v })}
          />
          {!st.demoMode && (
            <div className="space-y-3 border-t border-[var(--line)] pt-3">
              <label className="block">
                <span className="font-display text-[10px] font-semibold tracking-[0.18em] text-[var(--muted)]">ESP32 ENDPOINT</span>
                <input
                  type="text" value={st.endpoint} className="num mt-1.5 w-full"
                  onChange={(e) => set({ endpoint: e.target.value })}
                  placeholder="http://192.168.4.1"
                  spellCheck={false}
                />
                <span className="mt-1 block text-[11px] text-[var(--dim)]">Base URL of the ESP32 web server (SoftAP default: http://192.168.4.1). Polls GET /telemetry.</span>
              </label>
              <div className="flex items-end gap-3">
                <label className="block">
                  <span className="font-display text-[10px] font-semibold tracking-[0.18em] text-[var(--muted)]">POLL INTERVAL</span>
                  <select className="mt-1.5 block" value={st.pollMs} onChange={(e) => set({ pollMs: parseInt(e.target.value) })}>
                    <option value={500}>500 ms</option>
                    <option value={1000}>1000 ms</option>
                    <option value={2000}>2000 ms</option>
                  </select>
                </label>
                <button className="btn !px-3 !py-2 !text-[10.5px]" onClick={() => void testConnection()}>
                  {testState === "testing" ? "Testing…" : testState === "ok" ? "✓ Reachable" : testState === "fail" ? "✗ No response" : "Test connection"}
                </button>
              </div>
            </div>
          )}
          {st.demoMode && (
            <div className="grid grid-cols-2 gap-3 border-t border-[var(--line)] pt-3">
              <NumField label="DEMO ORIGIN LAT" unit="°" value={st.demoOriginLat} step={0.001} min={-90} max={90} onChange={(v) => set({ demoOriginLat: v })} />
              <NumField label="DEMO ORIGIN LNG" unit="°" value={st.demoOriginLng} step={0.001} min={-180} max={180} onChange={(v) => set({ demoOriginLng: v })} />
            </div>
          )}
        </Section>

        {/* Thresholds */}
        <Section
          icon={<IconChip size={16} />}
          title="SPEED LIMIT & EVENT THRESHOLDS"
          note="Stored in this browser (localStorage). They drive the speedometer zones, client-side overspeed detection and the demo simulator — the ESP32 firmware keeps its own thresholds."
        >
          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
            <NumField label="SPEED LIMIT" unit="km/h" value={st.speedLimit} step={5} min={20} max={160} onChange={(v) => set({ speedLimit: v })} />
            <NumField label="HARSH ACCELERATION" unit="g" value={st.harshAccel} step={0.1} min={0.5} max={5} onChange={(v) => set({ harshAccel: v })} />
            <NumField label="HARSH BRAKING" unit="g" value={st.harshBrake} step={0.1} min={-5} max={-0.5} onChange={(v) => set({ harshBrake: v })} />
            <NumField label="ACCIDENT THRESHOLD" unit="g" value={st.accidentG} step={0.1} min={1} max={8} onChange={(v) => set({ accidentG: v })} />
          </div>
          <div className="mt-4 rounded-lg border border-[var(--line)] bg-[var(--bg1)] p-3 text-[11.5px] leading-relaxed text-[var(--muted)]">
            <p className="font-display mb-1 text-[9.5px] font-semibold tracking-[0.2em] text-[var(--dim)]">SPEED ZONES</p>
            <p><span className="font-semibold text-[var(--green)]">SAFE</span> 0–{Math.max(0, st.speedLimit - 10)} km/h · <span className="font-semibold text-[var(--amber)]">CAUTION</span> {Math.max(0, st.speedLimit - 10)}–{st.speedLimit} km/h · <span className="font-semibold text-[var(--red)]">OVERSPEED</span> &gt; {st.speedLimit} km/h</p>
          </div>
        </Section>

        {/* Dashboard */}
        <Section icon={<IconGear size={16} />} title="DASHBOARD">
          <div className="divide-y divide-[var(--line)]">
            <Row title="Dark Mode" desc="Automotive night cluster. Disable for the light theme." checked={st.theme === "dark"} onChange={(v) => set({ theme: v ? "dark" : "light" })} />
            <Row title="Map Tracking" desc="Auto-follow the vehicle on the live map." checked={st.mapTracking} onChange={(v) => set({ mapTracking: v })} />
            <Row title="Sound Notifications" desc="Web audio alerts mirroring buzzer patterns (short / triple / emergency)." checked={st.sound} onChange={(v) => set({ sound: v })} />
            <Row title="Browser Notifications" desc="System notifications for harsh events and accidents. Permission is asked only now, from this toggle." checked={st.notifications} onChange={(v) => set({ notifications: v })} />
          </div>
          {st.notifications && notifPerm !== "granted" && (
            <div className="mt-2 flex items-center justify-between rounded-lg border border-[var(--amber)] bg-[var(--amber-soft)] p-3">
              <span className="text-[12px] font-semibold text-[var(--amber)]">
                <IconBell size={13} className="mr-1 inline" /> Permission: {notifPerm}
              </span>
              <button className="btn !px-3 !py-1.5 !text-[10px]" onClick={() => set({ notifications: true })}>Request</button>
            </div>
          )}
        </Section>

        {/* Hardware reference */}
        <Section
          icon={<IconSatellite size={16} />}
          title="DRIVESAFE HARDWARE — GPIO REFERENCE"
          note="Fixed wiring of the physical black box. Read-only here — hardware settings live on the ESP32."
        >
          <ul className="num grid grid-cols-1 gap-1.5 text-[12.5px] sm:grid-cols-2">
            {[
              ["OLED SDA / MPU6050 SDA", "GPIO 21"],
              ["OLED SCL / MPU6050 SCL", "GPIO 22"],
              ["Trip Button", "GPIO 32"],
              ["Status LED", "GPIO 13"],
              ["Buzzer", "GPIO 27"],
              ["GPS TX → ESP32 RX", "GPIO 16"],
              ["GPS RX ← ESP32 TX", "GPIO 17"],
            ].map(([k, v]) => (
              <li key={k} className="flex items-center justify-between rounded-lg border border-[var(--line)] bg-[var(--bg1)] px-3 py-2">
                <span className="text-[var(--muted)]">{k}</span>
                <span className="font-bold text-[var(--cyan)]">{v}</span>
              </li>
            ))}
          </ul>
        </Section>

        {/* Data & privacy */}
        <Section
          icon={<IconShield size={16} />}
          title="DATA & PRIVACY"
          note="All data stays in this browser. Nothing is uploaded anywhere; no personal information is collected. Incoming ESP32 data is validated and never rendered as HTML."
        >
          <div className="flex flex-wrap gap-2">
            <button className="btn" onClick={() => { store.clearEvents(); store.toast("Events cleared", "Event history emptied", "info"); }}>
              <IconTrash size={13} /> Clear events
            </button>
            <button className="btn" onClick={() => { store.clearTrips(); store.toast("Trips cleared", "Trip history emptied", "info"); }}>
              <IconTrash size={13} /> Clear trips
            </button>
            <button
              className="btn"
              style={{ color: "var(--red)" }}
              onClick={() => { store.updateSettings({ ...DEFAULT_SETTINGS }); store.toast("Settings reset", "Defaults restored", "info"); }}
            >
              Reset settings
            </button>
          </div>
          <p className="mt-3 flex items-center gap-2 text-[11.5px] text-[var(--dim)]">
            <IconSound size={13} /> Buzzer, OLED and LED states shown only when actually reported by the device or simulator.
          </p>
        </Section>
      </div>
    </div>
  );
}
