import { MapPanel } from "../components/MapPanel";
import { Stat } from "../components/cards";
import { useDrive, useNow } from "../lib/store";
import { fmtCoord, fmtDuration, fmtKm } from "../lib/utils";
import { IconRoute } from "../components/icons";

export function MapPage() {
  const s = useDrive();
  useNow(1000);
  const p = s.packet;
  const duration = s.tripRunning && s.tripStartedAt ? Date.now() - s.tripStartedAt : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display flex items-center gap-2 text-lg font-bold tracking-wide">
          <IconRoute size={18} className="text-[var(--cyan)]" /> LIVE MAP & VEHICLE PATH
        </h1>
        <span className="pill" style={{ color: s.tripRunning ? "var(--green)" : "var(--dim)", borderColor: s.tripRunning ? "var(--green)" : "var(--line2)" }}>
          <span className={`dot ${s.tripRunning ? "dot-live" : ""}`} /> {s.tripRunning ? "RECORDING PATH" : "TRIP STOPPED"}
        </span>
      </div>

      <MapPanel height="calc(100vh - 285px)" className="min-h-[420px]" />

      <div className="card grid grid-cols-2 gap-4 p-4 sm:grid-cols-3 xl:grid-cols-6">
        <Stat label="DISTANCE" value={fmtKm(s.tripDistanceKm)} mono />
        <Stat label="TRIP DURATION" value={fmtDuration(duration)} mono />
        <Stat label="CURRENT SPEED" value={p ? `${p.speed.toFixed(1)} km/h` : "——"} mono accent="var(--cyan)" />
        <Stat label="LATITUDE" value={fmtCoord(p?.latitude ?? null)} mono />
        <Stat label="LONGITUDE" value={fmtCoord(p?.longitude ?? null)} mono />
        <Stat label="ACCURACY" value={p?.accuracy !== null && p?.accuracy !== undefined ? `± ${p.accuracy.toFixed(0)} m` : "——"} mono />
      </div>
    </div>
  );
}
