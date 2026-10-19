import type { ReactNode } from "react";
import type { ViewId } from "../lib/types";
import { useDrive, useNow } from "../lib/store";
import { fmtDate, timeAgo } from "../lib/utils";
import {
  IconCar, IconChart, IconGear, IconHome, IconMap, IconPulse, IconSatellite,
  IconShield, IconSteering, IconWarning,
} from "./icons";

export const NAV: { id: ViewId; label: string; icon: (s: number) => ReactNode; mobile?: boolean }[] = [
  { id: "dashboard", label: "Dashboard", icon: (s) => <IconHome size={s} />, mobile: true },
  { id: "map", label: "Live Map", icon: (s) => <IconMap size={s} />, mobile: true },
  { id: "analytics", label: "Analytics", icon: (s) => <IconChart size={s} />, mobile: true },
  { id: "events", label: "Events", icon: (s) => <IconWarning size={s} />, mobile: true },
  { id: "trips", label: "Trips", icon: (s) => <IconPulse size={s} /> },
  { id: "settings", label: "Settings", icon: (s) => <IconGear size={s} />, mobile: true },
];

function Clock() {
  useNow(1000);
  const now = new Date();
  return (
    <div className="text-right leading-tight">
      <p className="num text-[15px] font-semibold">{now.toLocaleTimeString([], { hour12: false })}</p>
      <p className="text-[10px] text-[var(--dim)]">{fmtDate(now.getTime())}</p>
    </div>
  );
}

export function TopBar({ view, onNav }: { view: ViewId; onNav: (v: ViewId) => void }) {
  const s = useDrive();
  const online = s.source === "demo" ? true : s.linkOk && s.lastUpdate > 0;
  return (
    <header className="sticky top-0 z-[900] border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--bg1)_82%,transparent)] backdrop-blur-md">
      <div className="mx-auto flex h-[58px] max-w-[1460px] items-center gap-3 px-4 lg:px-6">
        <button className="flex items-center gap-2.5" onClick={() => onNav("dashboard")} aria-label="DriveSafe home">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--line2)] bg-[var(--panel2)] text-[var(--amber)]">
            <IconSteering size={21} />
          </span>
          <span className="text-left leading-none">
            <span className="font-display block text-[17px] font-bold tracking-wide">
              Drive<span className="text-[var(--amber)]">Safe</span>
            </span>
            <span className="block text-[8.5px] tracking-[0.28em] text-[var(--dim)]">SMART VEHICLE BLACK BOX</span>
          </span>
        </button>

        <span className="pill ml-2 hidden sm:inline-flex" style={online ? { color: "var(--green)", borderColor: "var(--green)" } : { color: "var(--red)", borderColor: "var(--red)" }} role="status">
          <span className={`dot ${online ? "dot-live" : "blink-soft"}`} />
          {online ? "SYSTEM ONLINE" : s.source === "esp32" ? "LINK DOWN" : "STANDBY"}
        </span>
        {s.source === "demo" && (
          <span className="pill hidden !text-[9px] md:inline-flex" style={{ color: "#171001", background: "var(--amber)", borderColor: "var(--amber)" }}>
            DEMO MODE
          </span>
        )}

        <div className="ml-auto flex items-center gap-3">
          <span className="pill hidden lg:inline-flex" style={{ color: (s.packet?.gpsFix) ? "var(--green)" : "var(--amber)", borderColor: (s.packet?.gpsFix) ? "var(--green)" : "var(--amber)" }}>
            <IconSatellite size={11} /> {s.packet?.gpsFix ? `GPS · ${s.packet.satellites} SAT` : "GPS · NO FIX"}
          </span>
          <div className="hidden sm:block"><Clock /></div>
          <button
            className="btn !px-3 !py-2"
            onClick={() => onNav("settings")}
            aria-label="Open settings"
            style={view === "settings" ? { borderColor: "var(--amber)", color: "var(--amber)" } : undefined}
          >
            <IconGear size={15} />
            <span className="hidden sm:inline">Settings</span>
          </button>
        </div>
      </div>
    </header>
  );
}

export function Sidebar({ view, onNav }: { view: ViewId; onNav: (v: ViewId) => void }) {
  const s = useDrive();
  const online = s.source === "demo" ? true : s.linkOk && s.lastUpdate > 0;
  return (
    <aside className="sticky top-[58px] hidden h-[calc(100vh-58px)] w-[210px] flex-none flex-col border-r border-[var(--line)] bg-[var(--bg1)] px-3 py-5 lg:flex">
      <nav className="flex flex-col gap-1" aria-label="Main navigation">
        {NAV.map((n) => (
          <button
            key={n.id}
            className="nav-item flex items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-left text-[13px] font-medium text-[var(--muted)] hover:bg-[var(--panel2)] hover:text-[var(--text)]"
            aria-current={view === n.id}
            onClick={() => onNav(n.id)}
          >
            {n.icon(16)}
            {n.label}
            {n.id === "events" && s.events.length > 0 && (
              <span className="num ml-auto rounded-md bg-[var(--amber-soft)] px-1.5 text-[10px] font-bold text-[var(--amber)]">{s.events.length}</span>
            )}
          </button>
        ))}
      </nav>

      <div className="mt-auto space-y-3">
        <div className="card p-3">
          <p className="font-display text-[9.5px] font-semibold tracking-[0.2em] text-[var(--dim)]">DATA LINK</p>
          <p className="mt-1.5 flex items-center gap-2 text-[12px] font-semibold" style={{ color: s.source === "demo" ? "var(--amber)" : online ? "var(--green)" : "var(--red)" }}>
            <span className={`dot ${online || s.source === "demo" ? "dot-live" : "blink-soft"}`} />
            {s.source === "demo" ? "DEMO SIMULATOR" : online ? "ESP32 CONNECTED" : "RECONNECTING"}
          </p>
          <p className="mt-0.5 text-[10.5px] text-[var(--dim)]">
            {s.lastUpdate > 0 ? `Last update ${timeAgo(s.lastUpdate)}` : "Waiting for data…"}
          </p>
        </div>
        <div className="flex items-center gap-2 px-1 text-[10px] text-[var(--dim)]">
          <IconShield size={13} className="text-[var(--cyan)]" />
          <span>DriveSafe v1.0 · ESP32 black box</span>
        </div>
      </div>
    </aside>
  );
}

export function BottomNav({ view, onNav }: { view: ViewId; onNav: (v: ViewId) => void }) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-[950] grid grid-cols-5 border-t border-[var(--line)] bg-[color-mix(in_srgb,var(--bg1)_92%,transparent)] backdrop-blur-md lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Mobile navigation"
    >
      {NAV.filter((n) => n.mobile).map((n) => (
        <button
          key={n.id}
          className="flex flex-col items-center gap-0.5 py-2 text-[9.5px] font-semibold tracking-wide text-[var(--dim)] transition-colors"
          style={view === n.id ? { color: "var(--amber)" } : undefined}
          aria-current={view === n.id ? "page" : undefined}
          onClick={() => onNav(n.id)}
        >
          {n.icon(19)}
          {n.id === "dashboard" ? "Home" : n.label.split(" ")[0]}
        </button>
      ))}
    </nav>
  );
}

export function DemoBanner() {
  const s = useDrive();
  if (s.source !== "demo") return null;
  return (
    <div className="border-b border-[var(--line)] bg-[var(--amber-soft)]" role="note">
      <div className="mx-auto flex max-w-[1460px] items-center gap-2.5 px-4 py-1.5 text-[11.5px] font-semibold text-[var(--amber)] lg:px-6">
        <IconCar size={14} />
        DEMO MODE active — all telemetry below is simulated for safe demonstration. Switch to ESP32 in Settings.
      </div>
    </div>
  );
}
