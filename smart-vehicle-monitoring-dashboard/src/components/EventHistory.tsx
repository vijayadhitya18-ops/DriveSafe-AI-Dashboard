import { useMemo, useState } from "react";
import type { DriveEvent } from "../lib/types";
import { EVENT_META, fmtClock, fmtCoord } from "../lib/utils";
import { store, useDrive } from "../lib/store";
import { IconDownload, IconHistory, IconTrash } from "./icons";

const GROUPS = [
  { id: "all", label: "All" },
  { id: "acceleration", label: "Acceleration" },
  { id: "braking", label: "Braking" },
  { id: "turning", label: "Turning" },
  { id: "overspeed", label: "Overspeed" },
  { id: "accident", label: "Accident" },
] as const;

const SEV_COLOR: Record<string, string> = {
  Low: "var(--cyan)",
  Medium: "var(--amber)",
  High: "var(--orange)",
  Critical: "var(--red)",
};

export function EventHistory({ compact = false }: { compact?: boolean }) {
  const s = useDrive();
  const [group, setGroup] = useState<string>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const events = useMemo(() => {
    let list = s.events;
    if (group !== "all") list = list.filter((e) => EVENT_META[e.kind].group === group);
    if (from) list = list.filter((e) => e.ts >= new Date(from).getTime());
    if (to) list = list.filter((e) => e.ts <= new Date(to).getTime() + 60_000);
    return list;
  }, [s.events, group, from, to]);

  const shown = compact ? events.slice(0, 8) : events;

  const exportCsv = () => {
    const rows = [
      ["time", "event", "speed_kmh", "latitude", "longitude", "severity", "score_impact", "source"],
      ...events.map((e) => [
        new Date(e.ts).toISOString(), EVENT_META[e.kind].label, e.speed.toFixed(1),
        e.lat?.toFixed(6) ?? "", e.lng?.toFixed(6) ?? "", e.severity, String(e.scoreImpact),
        e.demo ? "demo" : "esp32",
      ]),
    ];
    const blob = new Blob([rows.map((r) => r.join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `drivesafe-events-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <section className="card p-5 rise-in" aria-label="Event history">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="card-title">
          <IconHistory size={13} className="text-[var(--cyan)]" /> EVENT HISTORY
          <span className="num rounded-md border border-[var(--line)] px-1.5 py-0.5 text-[10px] text-[var(--dim)]">{events.length}</span>
        </h2>
        {!compact && (
          <div className="flex gap-2">
            <button className="btn !px-3 !py-1.5 !text-[10.5px]" onClick={exportCsv} disabled={events.length === 0}>
              <IconDownload size={12} /> CSV
            </button>
            <button className="btn !px-3 !py-1.5 !text-[10.5px]" style={{ color: "var(--red)" }} onClick={() => store.clearEvents()} disabled={s.events.length === 0}>
              <IconTrash size={12} /> Clear
            </button>
          </div>
        )}
      </div>

      {!compact && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Event type filter">
            {GROUPS.map((g) => (
              <button
                key={g.id}
                role="tab"
                aria-selected={group === g.id}
                className="pill cursor-pointer transition-colors hover:border-[var(--cyan)]"
                style={group === g.id ? { color: "var(--cyan)", borderColor: "var(--cyan)", background: "var(--cyan-soft)" } : undefined}
                onClick={() => setGroup(g.id)}
              >
                {g.label}
              </button>
            ))}
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2 text-[11px] text-[var(--dim)]">
            <label className="flex items-center gap-1.5">
              From
              <input type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} className="!py-1 !text-[12px]" />
            </label>
            <label className="flex items-center gap-1.5">
              To
              <input type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} className="!py-1 !text-[12px]" />
            </label>
          </div>
        </div>
      )}

      <div className={`mt-3 overflow-x-auto ${compact ? "" : "max-h-[440px] overflow-y-auto rounded-xl border border-[var(--line)]"}`}>
        <table className="ds-table w-full min-w-[760px] border-collapse">
          <thead>
            <tr>
              <th>Time</th><th>Event</th><th>Speed</th><th>Latitude</th><th>Longitude</th><th>Severity</th><th>Score</th><th>Src</th>
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-[12.5px] text-[var(--dim)]">
                  No events recorded{group !== "all" ? " for this filter" : ""}. Drive to generate events.
                </td>
              </tr>
            ) : (
              shown.map((e: DriveEvent) => {
                const meta = EVENT_META[e.kind];
                return (
                  <tr key={e.id}>
                    <td className="num text-[var(--muted)]">{fmtClock(e.ts)}</td>
                    <td className="font-semibold">{meta.label}</td>
                    <td className="num">{e.speed.toFixed(0)} km/h</td>
                    <td className="num text-[var(--muted)]">{fmtCoord(e.lat)}</td>
                    <td className="num text-[var(--muted)]">{fmtCoord(e.lng)}</td>
                    <td>
                      <span className="pill !text-[9.5px]" style={{ color: SEV_COLOR[e.severity], borderColor: SEV_COLOR[e.severity] }}>
                        {e.severity.toUpperCase()}
                      </span>
                    </td>
                    <td className="num font-semibold" style={{ color: e.scoreImpact < 0 ? "var(--red)" : "var(--green)" }}>
                      {e.scoreImpact > 0 ? `+${e.scoreImpact}` : e.scoreImpact}
                    </td>
                    <td>
                      {e.demo ? (
                        <span className="pill !text-[9px]" style={{ color: "var(--amber)", borderColor: "var(--amber)" }}>DEMO</span>
                      ) : (
                        <span className="pill !text-[9px]" style={{ color: "var(--green)", borderColor: "var(--green)" }}>HW</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
