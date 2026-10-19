import { useEffect, useRef } from "react";
import { Chart } from "chart.js/auto";
import { store, useDrive } from "../lib/store";
import type { TripRecord } from "../lib/types";
import { EVENT_META, fmtClock, fmtDate, fmtDuration, fmtKm, googleMapsUrl } from "../lib/utils";
import { MapPanel } from "./MapPanel";
import { IconCheck, IconCopy, IconExternal, IconFlag, IconShare, IconWarning, IconX } from "./icons";
import { Stat } from "./cards";

/* ───────────────────────── Toast host ───────────────────────── */
export function ToastHost() {
  const s = useDrive();
  const toneColor = { info: "var(--cyan)", warn: "var(--amber)", danger: "var(--red)", ok: "var(--green)" };
  return (
    <div className="pointer-events-none fixed right-4 top-16 z-[1200] flex w-[300px] flex-col gap-2" aria-live="polite">
      {s.toasts.map((t) => (
        <button
          key={t.id}
          className="toast-in card pointer-events-auto flex items-start gap-2.5 p-3 text-left"
          style={{ borderColor: toneColor[t.tone] }}
          onClick={() => store.dismissToast(t.id)}
        >
          <span className="mt-1 h-2 w-2 flex-none rounded-full" style={{ background: toneColor[t.tone] }} />
          <span className="min-w-0">
            <span className="font-display block text-[12px] font-bold tracking-wider" style={{ color: toneColor[t.tone] }}>
              {t.title.toUpperCase()}
            </span>
            <span className="block text-[12px] text-[var(--muted)]">{t.body}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

/* ───────────────────────── Accident emergency overlay ───────────────────────── */
export function AccidentOverlay() {
  const s = useDrive();
  const a = s.accident;
  if (!s.accidentOpen || !a) return null;

  const locStr = a.lat !== null && a.lng !== null ? `${a.lat.toFixed(6)}, ${a.lng.toFixed(6)}` : null;
  const copy = async () => {
    if (!locStr) return;
    try {
      await navigator.clipboard.writeText(locStr);
      store.toast("Location copied", locStr, "ok");
    } catch {
      store.toast("Copy failed", "Clipboard unavailable in this browser", "warn");
    }
  };
  const share = async () => {
    if (!locStr || !navigator.share) return;
    try {
      await navigator.share({ title: "DriveSafe accident location", text: `Accident detected at ${locStr}`, url: googleMapsUrl(a.lat!, a.lng!) });
    } catch { /* user cancelled */ }
  };

  return (
    <div className="fixed inset-0 z-[1100] overflow-y-auto bg-[rgba(5,7,11,0.88)] p-4 backdrop-blur-sm sm:p-8" role="alertdialog" aria-modal="true" aria-label="Accident detected">
      <div className="flash-critical relative mx-auto max-w-3xl overflow-hidden rounded-2xl border-2 border-[var(--red)] bg-[var(--panel)]">
        <div className="hazard h-2.5" />
        <div className="p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="blink-soft flex h-16 w-16 flex-none items-center justify-center rounded-2xl border-2 border-[var(--red)] text-[var(--red)]">
                <IconWarning size={34} />
              </span>
              <div>
                <p className="font-display text-[11px] font-bold tracking-[0.3em] text-[var(--red)]">EMERGENCY</p>
                <h1 className="font-display text-3xl font-bold text-[var(--red)] sm:text-4xl">🚨 ACCIDENT DETECTED</h1>
                <p className="mt-1 text-[13px] text-[var(--muted)]">
                  {fmtDate(a.ts)} · {fmtClock(a.ts)} {a.demo && <span className="pill ml-1 !text-[9px]" style={{ color: "var(--amber)", borderColor: "var(--amber)" }}>DEMO</span>}
                </p>
              </div>
            </div>
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
            <div className="card p-3"><Stat label="TIME" value={fmtClock(a.ts)} mono /></div>
            <div className="card p-3"><Stat label="SPEED" value={`${a.speed.toFixed(0)} km/h`} mono accent="var(--red)" /></div>
            <div className="card p-3"><Stat label="ACCELERATION" value={`${a.peakG.toFixed(2)} g`} mono accent="var(--red)" /></div>
            <div className="card p-3"><Stat label="GPS" value={a.gpsFix ? "FIXED" : "NO FIX"} accent={a.gpsFix ? "var(--green)" : "var(--amber)"} /></div>
            <div className="card p-3"><Stat label="SATELLITES" value={String(a.satellites)} mono /></div>
          </dl>

          <div className="mt-5 overflow-hidden rounded-xl border border-[var(--line)]">
            {a.gpsFix ? (
              <MapPanel mode="static" staticLat={a.lat} staticLng={a.lng} height="260px" showControls={false} />
            ) : (
              <div className="flex h-[140px] items-center justify-center bg-[var(--bg1)]">
                <p className="text-[13px] text-[var(--dim)]">No GPS position available for this event.</p>
              </div>
            )}
          </div>
          {locStr && (
            <p className="num mt-2 text-center text-[12px] text-[var(--muted)]">{locStr}</p>
          )}

          <div className="mt-5 flex flex-wrap justify-center gap-2.5">
            {a.gpsFix && (
              <a className="btn btn-red" href={googleMapsUrl(a.lat!, a.lng!)} target="_blank" rel="noopener noreferrer">
                <IconExternal size={14} /> OPEN GOOGLE MAPS
              </a>
            )}
            <button className="btn" onClick={() => void copy()} disabled={!locStr}>
              <IconCopy size={14} /> COPY LOCATION
            </button>
            {typeof navigator !== "undefined" && "share" in navigator && (
              <button className="btn" onClick={() => void share()} disabled={!locStr}>
                <IconShare size={14} /> SHARE
              </button>
            )}
          </div>
          <p className="mt-4 text-center text-[11px] text-[var(--dim)]">
            DriveSafe never contacts emergency services automatically. Verify safety, then dismiss.
          </p>
          <div className="mt-4 flex justify-center">
            <button className="btn btn-green !px-8" onClick={() => store.dismissAccident()}>
              <IconCheck size={14} /> I'M OK — DISMISS & RESUME
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Trip summary modal ───────────────────────── */
export function TripSummaryModal() {
  const s = useDrive();
  const rec = s.summary;
  if (!rec) return null;
  return (
    <div className="fixed inset-0 z-[1050] flex items-start justify-center overflow-y-auto bg-[rgba(5,7,11,0.8)] p-4 backdrop-blur-sm sm:items-center" role="dialog" aria-modal="true" aria-label="Trip summary">
      <div className="card relative my-auto w-full max-w-2xl overflow-hidden rise-in">
        <div className="flex items-center justify-between border-b border-[var(--line)] bg-[var(--panel2)] px-6 py-4">
          <div className="flex items-center gap-3">
            <IconFlag size={20} className="text-[var(--green)]" />
            <div>
              <h2 className="font-display text-lg font-bold tracking-wide">TRIP COMPLETE</h2>
              <p className="text-[11.5px] text-[var(--dim)]">{fmtDate(rec.startedAt)} · {fmtClock(rec.startedAt)} → {fmtClock(rec.endedAt)}
                {rec.demo && <span className="pill ml-2 !text-[9px]" style={{ color: "var(--amber)", borderColor: "var(--amber)" }}>DEMO</span>}
              </p>
            </div>
          </div>
          <button className="btn !px-2.5 !py-1.5" onClick={() => store.closeSummary()} aria-label="Close summary"><IconX size={14} /></button>
        </div>

        <div className="grid gap-5 p-6 sm:grid-cols-2">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Stat label="DURATION" value={fmtDuration(rec.endedAt - rec.startedAt)} mono />
            <Stat label="DISTANCE" value={fmtKm(rec.distanceKm)} mono />
            <Stat label="AVERAGE SPEED" value={`${rec.avgSpeed.toFixed(0)} km/h`} mono />
            <Stat label="MAXIMUM SPEED" value={`${rec.maxSpeed.toFixed(0)} km/h`} mono />
            <Stat label="EVENTS" value={String(Object.values(rec.counts).reduce((a, b) => a + b, 0))} mono accent="var(--amber)" />
            <Stat label="FINAL SCORE" value={`${rec.score}/100`} mono accent={rec.score >= 90 ? "var(--green)" : rec.score >= 75 ? "var(--cyan)" : rec.score >= 50 ? "var(--amber)" : "var(--red)"} />
            <Stat label="HARSH ACCEL" value={String(rec.counts.HARSH_ACCEL ?? 0)} mono />
            <Stat label="HARSH BRAKE" value={String(rec.counts.HARSH_BRAKE ?? 0)} mono />
            <Stat label="OVERSPEED" value={String(rec.counts.OVERSPEED ?? 0)} mono />
            <Stat label="TURNS" value={String((rec.counts.LEFT_TURN ?? 0) + (rec.counts.RIGHT_TURN ?? 0))} mono />
          </dl>
          <SummaryCharts rec={rec} />
        </div>
      </div>
    </div>
  );
}

function SummaryCharts({ rec }: { rec: TripRecord }) {
  const lineRef = useRef<HTMLCanvasElement>(null);
  const donutRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const charts: Chart[] = [];
    const muted = getComputedStyle(document.documentElement).getPropertyValue("--muted").trim();
    const dim = getComputedStyle(document.documentElement).getPropertyValue("--dim").trim();
    if (lineRef.current) {
      charts.push(new Chart(lineRef.current, {
        type: "line",
        data: {
          labels: rec.speedProfile.map((_, i) => `${i * 2.5}s`),
          datasets: [{
            label: "km/h",
            data: rec.speedProfile,
            borderColor: "#3ec6e8",
            backgroundColor: "rgba(62,198,232,0.12)",
            fill: true, borderWidth: 1.6, pointRadius: 0, tension: 0.3,
          }],
        },
        options: {
          responsive: true, maintainAspectRatio: false, animation: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: dim, font: { size: 8 }, maxTicksLimit: 5 }, grid: { display: false } },
            y: { ticks: { color: dim, font: { size: 8 } }, grid: { color: "rgba(120,140,170,0.1)" } },
          },
        },
      }));
    }
    if (donutRef.current) {
      const entries = Object.entries(rec.counts);
      const palette: Record<string, string> = {
        HARSH_ACCEL: "#ffb224", HARSH_BRAKE: "#ff7a45", LEFT_TURN: "#3ec6e8", RIGHT_TURN: "#4d9fff",
        OVERSPEED: "#ff4d61", ACCIDENT: "#d92638",
      };
      charts.push(new Chart(donutRef.current, {
        type: "doughnut",
        data: {
          labels: entries.map(([k]) => EVENT_META[k as keyof typeof EVENT_META]?.label ?? k),
          datasets: [{ data: entries.map(([, v]) => v), backgroundColor: entries.map(([k]) => palette[k] ?? "#5c7189"), borderWidth: 0 }],
        },
        options: {
          responsive: true, maintainAspectRatio: false, cutout: "62%",
          plugins: { legend: { position: "bottom", labels: { color: muted, boxWidth: 8, boxHeight: 8, font: { size: 9 } } } },
        },
      }));
    }
    return () => charts.forEach((c) => c.destroy());
  }, [rec]);

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="font-display mb-1 text-[9.5px] font-semibold tracking-[0.2em] text-[var(--muted)]">SPEED PROFILE</p>
        <div className="h-[104px] rounded-xl border border-[var(--line)] bg-[var(--bg1)] p-1.5">
          <canvas ref={lineRef} />
        </div>
      </div>
      <div>
        <p className="font-display mb-1 text-[9.5px] font-semibold tracking-[0.2em] text-[var(--muted)]">EVENT BREAKDOWN</p>
        <div className="h-[120px] rounded-xl border border-[var(--line)] bg-[var(--bg1)] p-1.5">
          <canvas ref={donutRef} />
        </div>
      </div>
    </div>
  );
}
