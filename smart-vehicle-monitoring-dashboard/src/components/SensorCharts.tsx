import { useEffect, useRef } from "react";
import { Chart } from "chart.js/auto";
import { useDrive } from "../lib/store";
import { fmtClock } from "../lib/utils";

const cssVar = (name: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();

function makeChart(canvas: HTMLCanvasElement, axes: [string, string, string], yLabel: string) {
  const colors = [cssVar("--amber"), cssVar("--cyan"), cssVar("--green")];
  return new Chart(canvas, {
    type: "line",
    data: {
      labels: [],
      datasets: axes.map((a, i) => ({
        label: a,
        data: [],
        borderColor: colors[i],
        backgroundColor: colors[i] + "22",
        borderWidth: 1.6,
        pointRadius: 0,
        tension: 0.35,
        fill: false,
      })),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: {
          position: "top",
          align: "end",
          labels: { boxWidth: 9, boxHeight: 9, color: cssVar("--muted"), font: { size: 10, family: "Chakra Petch" } },
        },
        tooltip: { backgroundColor: cssVar("--panel3"), titleColor: cssVar("--text"), bodyColor: cssVar("--muted") },
      },
      scales: {
        x: {
          ticks: { color: cssVar("--dim"), font: { size: 9 }, maxTicksLimit: 6, maxRotation: 0 },
          grid: { color: "rgba(120,140,170,0.08)" },
        },
        y: {
          title: { display: true, text: yLabel, color: cssVar("--dim"), font: { size: 9 } },
          ticks: { color: cssVar("--dim"), font: { size: 9 } },
          grid: { color: "rgba(120,140,170,0.1)" },
        },
      },
    },
  });
}

export function SensorCharts() {
  const s = useDrive();
  const accelRef = useRef<HTMLCanvasElement>(null);
  const gyroRef = useRef<HTMLCanvasElement>(null);
  const charts = useRef<{ a: Chart | null; g: Chart | null }>({ a: null, g: null });
  const theme = s.settings.theme;

  useEffect(() => {
    if (!accelRef.current || !gyroRef.current) return;
    charts.current.a = makeChart(accelRef.current, ["X", "Y", "Z"], "g");
    charts.current.g = makeChart(gyroRef.current, ["X", "Y", "Z"], "°/s");
    return () => {
      charts.current.a?.destroy();
      charts.current.g?.destroy();
      charts.current = { a: null, g: null };
    };
  }, [theme]);

  const samples = s.samples;
  useEffect(() => {
    const win = samples.slice(-60);
    const labels = win.map((x) => fmtClock(x.t));
    const feed = (chart: Chart | null, key: "a" | "g") => {
      if (!chart) return;
      chart.data.labels = labels;
      const axes = key === "a" ? (["ax", "ay", "az"] as const) : (["gx", "gy", "gz"] as const);
      axes.forEach((axis, i) => {
        chart.data.datasets[i].data = win.map((w) => w[axis] as number | null);
      });
      chart.update("none");
    };
    feed(charts.current.a, "a");
    feed(charts.current.g, "g");
  }, [samples]);

  const mpuAvailable = samples.length > 0 && samples.some((x) => x.ax !== null || x.gx !== null);

  return (
    <section className="card p-5 rise-in" aria-label="MPU6050 inertial sensors">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="card-title">MPU6050 · INERTIAL SENSORS</h2>
        <div className="flex gap-3">
          {s.packet && (
            <>
              <Mini label="AX" value={s.packet.ax} unit="g" />
              <Mini label="AY" value={s.packet.ay} unit="g" />
              <Mini label="AZ" value={s.packet.az} unit="g" />
              <Mini label="GZ" value={s.packet.gz} unit="°/s" />
            </>
          )}
        </div>
      </div>

      {!mpuAvailable ? (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="flex h-[190px] items-center justify-center rounded-xl border border-dashed border-[var(--line2)] bg-[var(--bg1)]">
              <p className="text-[12.5px] text-[var(--dim)]">Sensor data unavailable</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <p className="font-display mb-1 text-[10px] font-semibold tracking-[0.2em] text-[var(--muted)]">ACCELERATION (g)</p>
            <div className="h-[190px] rounded-xl border border-[var(--line)] bg-[var(--bg1)] p-2">
              <canvas ref={accelRef} aria-label="Acceleration chart" role="img" />
            </div>
          </div>
          <div>
            <p className="font-display mb-1 text-[10px] font-semibold tracking-[0.2em] text-[var(--muted)]">GYROSCOPE (°/s)</p>
            <div className="h-[190px] rounded-xl border border-[var(--line)] bg-[var(--bg1)] p-2">
              <canvas ref={gyroRef} aria-label="Gyroscope chart" role="img" />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function Mini({ label, value, unit }: { label: string; value: number | null; unit: string }) {
  return (
    <span className="num text-right text-[11px] leading-tight">
      <span className="block font-display text-[8.5px] tracking-[0.18em] text-[var(--dim)]">{label}</span>
      <span className="font-semibold text-[var(--text)]">{value === null ? "—" : value.toFixed(2)}</span>
      <span className="text-[var(--dim)]"> {unit}</span>
    </span>
  );
}
