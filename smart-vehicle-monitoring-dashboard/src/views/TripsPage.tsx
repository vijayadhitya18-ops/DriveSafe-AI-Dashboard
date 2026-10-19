import { store, useDrive, useNow } from "../lib/store";
import { fmtClock, fmtDate, fmtDuration, fmtKm } from "../lib/utils";
import { IconFlag, IconTrash } from "../components/icons";
import { scoreBand } from "../lib/utils";

export function TripsPage() {
  const s = useDrive();
  useNow(1000);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display flex items-center gap-2 text-lg font-bold tracking-wide">
          <IconFlag size={18} className="text-[var(--green)]" /> TRIP HISTORY
        </h1>
        <button className="btn !px-3 !py-1.5 !text-[10.5px]" style={{ color: "var(--red)" }} onClick={() => store.clearTrips()} disabled={s.trips.length === 0}>
          <IconTrash size={12} /> Clear history
        </button>
      </div>

      {s.tripRunning && s.tripStartedAt && (
        <div className="card flex flex-wrap items-center justify-between gap-3 border-[var(--green)] p-4 rise-in" style={{ borderColor: "rgba(49,211,139,0.5)" }}>
          <p className="flex items-center gap-2.5 text-[13.5px] font-semibold text-[var(--green)]">
            <span className="dot dot-live h-2.5 w-2.5" /> TRIP IN PROGRESS
          </p>
          <p className="num text-[13px] text-[var(--muted)]">
            {fmtClock(s.tripStartedAt)} · {fmtDuration(Date.now() - s.tripStartedAt)} · {fmtKm(s.tripDistanceKm)}
          </p>
        </div>
      )}

      {s.trips.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 p-12 text-center">
          <IconFlag size={30} className="text-[var(--dim)]" />
          <p className="font-display text-[13px] font-semibold tracking-[0.15em] text-[var(--muted)]">NO COMPLETED TRIPS YET</p>
          <p className="max-w-md text-[12.5px] text-[var(--dim)]">
            Start a trip from the Dashboard (or let the demo simulator drive one) and stop it — the full summary lands here.
          </p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="ds-table w-full min-w-[780px] border-collapse">
            <thead>
              <tr>
                <th>Date</th><th>Start</th><th>End</th><th>Duration</th><th>Distance</th><th>Avg</th><th>Max</th><th>Events</th><th>Score</th><th>Src</th>
              </tr>
            </thead>
            <tbody>
              {s.trips.map((t) => {
                const band = scoreBand(t.score);
                const evCount = Object.values(t.counts).reduce((a, b) => a + b, 0);
                return (
                  <tr key={t.id} className="cursor-pointer" onClick={() => store.showSummary(t)} tabIndex={0}
                    onKeyDown={(e) => { if (e.key === "Enter") store.showSummary(t); }}
                    aria-label={`Open trip summary for ${fmtDate(t.startedAt)}`}>
                    <td>{fmtDate(t.startedAt)}</td>
                    <td className="num text-[var(--muted)]">{fmtClock(t.startedAt)}</td>
                    <td className="num text-[var(--muted)]">{fmtClock(t.endedAt)}</td>
                    <td className="num">{fmtDuration(t.endedAt - t.startedAt)}</td>
                    <td className="num">{fmtKm(t.distanceKm)}</td>
                    <td className="num">{t.avgSpeed.toFixed(0)} km/h</td>
                    <td className="num">{t.maxSpeed.toFixed(0)} km/h</td>
                    <td className="num" style={{ color: evCount ? "var(--amber)" : "var(--dim)" }}>{evCount}</td>
                    <td>
                      <span className="pill !text-[10px]" style={{ color: band.color, borderColor: band.color }}>{t.score}/100</span>
                    </td>
                    <td>
                      {t.demo ? (
                        <span className="pill !text-[9px]" style={{ color: "var(--amber)", borderColor: "var(--amber)" }}>DEMO</span>
                      ) : (
                        <span className="pill !text-[9px]" style={{ color: "var(--green)", borderColor: "var(--green)" }}>HW</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-[11px] text-[var(--dim)]">Click any trip to open its full summary with speed profile and event charts.</p>
    </div>
  );
}
