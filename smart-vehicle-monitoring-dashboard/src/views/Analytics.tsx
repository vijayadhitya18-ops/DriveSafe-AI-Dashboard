import { useEffect, useMemo, useRef } from "react";
import { Chart } from "chart.js/auto";
import { useDrive } from "../lib/store";
import { fmtDuration, fmtKm } from "../lib/utils";
import { IconChart } from "../components/icons";

const cssVar = (n: string) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

export function Analytics() {
  const s = useDrive();

  const stats = useMemo(() => {
    const trips = s.trips;
    const events = s.events;
    const totalKm = trips.reduce((a, t) => a + t.distanceKm, 0);
    const totalMs = trips.reduce((a, t) => a + (t.endedAt - t.startedAt), 0);
    const count = (k: string) => events.filter((e) => e.kind === k).length;
    return {
      trips: trips.length,
      km: totalKm,
      avg: trips.length ? trips.reduce((a, t) => a + t.avgSpeed, 0) / trips.length : 0,
      max: trips.reduce((a, t) => Math.max(a, t.maxSpeed), 0),
      time: totalMs,
      accel: count("HARSH_ACCEL"),
      brake: count("HARSH_BRAKE"),
      over: count("OVERSPEED"),
      crash: count("ACCIDENT"),
    };
  }, [s.trips, s.events]);

  const tiles: { label: string; value: string; color?: string }[] = [
    { label: "TOTAL TRIPS", value: String(stats.trips) },
    { label: "TOTAL DISTANCE", value: fmtKm(stats.km) },
    { label: "AVERAGE SPEED", value: `${stats.avg.toFixed(0)} km/h` },
    { label: "MAXIMUM SPEED", value: `${stats.max.toFixed(0)} km/h`, color: stats.max > s.settings.speedLimit ? "var(--red)" : undefined },
    { label: "DRIVING TIME", value: fmtDuration(stats.time) },
    { label: "HARSH ACCELS", value: String(stats.accel), color: stats.accel ? "var(--amber)" : undefined },
    { label: "HARSH BRAKES", value: String(stats.brake), color: stats.brake ? "var(--orange)" : undefined },
    { label: "OVERSPEED", value: String(stats.over), color: stats.over ? "var(--red)" : undefined },
    { label: "ACCIDENTS", value: String(stats.crash), color: stats.crash ? "var(--red)" : undefined },
  ];

  return (
    <div className="space-y-4">
      <h1 className="font-display flex items-center gap-2 text-lg font-bold tracking-wide">
        <IconChart size={18} className="text-[var(--cyan)]" /> DRIVING ANALYTICS
      </h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-9">
        {tiles.map((t) => (
          <div key={t.label} className="card p-3.5 transition-transform hover:-translate-y-0.5">
            <p className="font-display text-[9px] font-semibold tracking-[0.18em] text-[var(--dim)]">{t.label}</p>
            <p className="num mt-1 text-[19px] font-bold leading-none" style={{ color: t.color ?? "var(--text)" }}>{t.value}</p>
          </div>
        ))}
      </div>

      <AnalyticsCharts />
    </div>
  );
}

function Block({ title, empty, children }: { title: string; empty?: boolean; children: React.ReactNode }) {
  return (
    <div className="card rise-in p-4">
      <p className="font-display mb-2 text-[10px] font-semibold tracking-[0.22em] text-[var(--muted)]">{title}</p>
      {empty ? (
        <div className="flex h-[180px] items-center justify-center rounded-xl border border-dashed border-[var(--line2)] bg-[var(--bg1)]">
          <p className="text-[12.5px] text-[var(--dim)]">Complete a trip to populate this chart.</p>
        </div>
      ) : (
        <div className="h-[180px]">{children}</div>
      )}
    </div>
  );
}

/** Live session speed chart — created once, updated in place (no churn). */
function LiveSpeedChart({ data }: { data: { t: number; v: number }[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<{ destroy(): void } | null>(null);
  const theme = useDrive().settings.theme;

  useEffect(() => {
    if (!ref.current) return;
    const c = new Chart(ref.current, {
      type: "line",
      data: { labels: [], datasets: [{ label: "Speed km/h", data: [], borderColor: "#3ec6e8", backgroundColor: "rgba(62,198,232,0.14)", fill: true, borderWidth: 1.6, pointRadius: 0, tension: 0.3 }] },
      options: {
        responsive: true, maintainAspectRatio: false, animation: false,
        plugins: { legend: { labels: { color: cssVar("--muted"), boxWidth: 9, boxHeight: 9, font: { size: 10 } } } },
        scales: {
          x: { ticks: { color: cssVar("--dim"), font: { size: 9 }, maxTicksLimit: 7, maxRotation: 0 }, grid: { color: "rgba(120,140,170,0.09)" } },
          y: { ticks: { color: cssVar("--dim"), font: { size: 9 } }, grid: { color: "rgba(120,140,170,0.09)" } },
        },
      },
    });
    chartRef.current = c;
    return () => { c.destroy(); chartRef.current = null; };
  }, [theme]);

  useEffect(() => {
    const c = chartRef.current as Chart | null;
    if (!c) return;
    c.data.labels = data.map((d) => new Date(d.t).toLocaleTimeString([], { hour12: false, minute: "2-digit", second: "2-digit" }));
    c.data.datasets[0].data = data.map((d) => d.v);
    c.update("none");
  }, [data]);

  return <canvas ref={ref} aria-label="Speed over time" role="img" />;
}

function AnalyticsCharts() {
  const s = useDrive();
  const evTripRef = useRef<HTMLCanvasElement>(null);
  const scoreRef = useRef<HTMLCanvasElement>(null);
  const distRef = useRef<HTMLCanvasElement>(null);
  const donutRef = useRef<HTMLCanvasElement>(null);
  const theme = s.settings.theme;

  const trips = [...s.trips].slice(0, 12).reverse();
  const events = s.events;

  useEffect(() => {
    const muted = cssVar("--muted");
    const dim = cssVar("--dim");
    const gridC = "rgba(120,140,170,0.09)";
    const baseScale = {
      x: { ticks: { color: dim, font: { size: 9 }, maxTicksLimit: 7, maxRotation: 0 }, grid: { color: gridC } },
      y: { ticks: { color: dim, font: { size: 9 } }, grid: { color: gridC } },
    } as const;
    const legend = { labels: { color: muted, boxWidth: 9, boxHeight: 9, font: { size: 10 } } };
    const charts: { destroy(): void }[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mk = (el: HTMLCanvasElement | null, cfg: any) => {
      if (el) charts.push(new Chart(el, cfg));
    };

    const evCount = (t: (typeof trips)[number]) => Object.values(t.counts).reduce((a, b) => a + b, 0);
    mk(evTripRef.current, {
      type: "bar",
      data: {
        labels: trips.map((t) => new Date(t.startedAt).toLocaleDateString([], { day: "2-digit", month: "short" })),
        datasets: [{
          label: "Events", data: trips.map(evCount),
          backgroundColor: "rgba(255,178,36,0.75)", borderRadius: 5, maxBarThickness: 30,
        }],
      },
      options: { responsive: true, maintainAspectRatio: false, animation: false, plugins: { legend }, scales: baseScale },
    });

    mk(scoreRef.current, {
      type: "line",
      data: {
        labels: trips.map((t) => new Date(t.startedAt).toLocaleDateString([], { day: "2-digit", month: "short" })),
        datasets: [{
          label: "Final score", data: trips.map((t) => t.score),
          borderColor: "#31d38b", backgroundColor: "rgba(49,211,139,0.12)", fill: true,
          borderWidth: 1.8, pointRadius: 3, pointBackgroundColor: "#31d38b", tension: 0.3,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, animation: false, plugins: { legend },
        scales: { ...baseScale, y: { ...baseScale.y, min: 0, max: 100 } },
      },
    });

    mk(distRef.current, {
      type: "bar",
      data: {
        labels: trips.map((t) => new Date(t.startedAt).toLocaleDateString([], { day: "2-digit", month: "short" })),
        datasets: [{
          label: "km", data: trips.map((t) => +t.distanceKm.toFixed(2)),
          backgroundColor: "rgba(62,198,232,0.7)", borderRadius: 5, maxBarThickness: 30,
        }],
      },
      options: { responsive: true, maintainAspectRatio: false, animation: false, plugins: { legend }, scales: baseScale },
    });

    const kinds = ["HARSH_ACCEL", "HARSH_BRAKE", "LEFT_TURN", "RIGHT_TURN", "OVERSPEED", "ACCIDENT"] as const;
    const palette = ["#ffb224", "#ff7a45", "#3ec6e8", "#4d9fff", "#ff4d61", "#d92638"];
    mk(donutRef.current, {
      type: "doughnut",
      data: {
        labels: ["Harsh Accel", "Harsh Brake", "Left Turn", "Right Turn", "Overspeed", "Accident"],
        datasets: [{
          data: kinds.map((k) => events.filter((e) => e.kind === k).length),
          backgroundColor: palette, borderWidth: 0,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: "60%",
        plugins: { legend: { position: "bottom", labels: { color: muted, boxWidth: 9, boxHeight: 9, font: { size: 10 } } } },
      },
    });

    return () => charts.forEach((c) => c.destroy());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, trips.length, events.length]);

  const empty = s.trips.length === 0;

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Block title="SPEED OVER TIME (LIVE SESSION)">
        <LiveSpeedChart data={s.speedHistory} />
      </Block>
      <Block title="EVENT DISTRIBUTION">
        <canvas ref={donutRef} />
      </Block>
      <Block title="DRIVER SCORE OVER TIME" empty={empty}>
        <canvas ref={scoreRef} />
      </Block>
      <Block title="EVENTS PER TRIP" empty={empty}>
        <canvas ref={evTripRef} />
      </Block>
      <Block title="DISTANCE PER TRIP" empty={empty}>
        <canvas ref={distRef} />
      </Block>
    </div>
  );
}
