import { useEffect, useRef, useState } from "react";
import { scoreBand, speedZone } from "../lib/utils";

/** rAF lerp hook — gives gauges their smooth needle behaviour. */
export function useLerped(target: number, rate = 0.12) {
  const [v, setV] = useState(target);
  const ref = useRef(target);
  useEffect(() => {
    let raf = 0;
    const step = () => {
      const diff = target - ref.current;
      if (Math.abs(diff) < 0.05) {
        ref.current = target;
        setV(target);
        return;
      }
      ref.current += diff * rate;
      setV(ref.current);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, rate]);
  return v;
}

/* ───────────────────────── Speedometer ───────────────────────── */
export function Speedometer({ speed, limit }: { speed: number; limit: number }) {
  const gaugeMax = Math.max(120, Math.ceil((limit + 60) / 20) * 20);
  const shown = useLerped(Math.min(speed, gaugeMax));
  const zone = speedZone(speed, limit);

  const SWEEP = 270;
  const frac = Math.min(1, shown / gaugeMax);
  const pct = (v: number) => (Math.min(v, gaugeMax) / gaugeMax) * (SWEEP / 360) * 100;

  const cautionStart = Math.max(0, limit - 10);
  const ticks = [];
  const step = gaugeMax <= 140 ? 20 : 40;
  for (let v = 0; v <= gaugeMax; v += step) {
    const a = ((v / gaugeMax) * SWEEP - 135) * (Math.PI / 180);
    const x1 = 100 + Math.sin(a) * 82;
    const y1 = 100 - Math.cos(a) * 82;
    const x2 = 100 + Math.sin(a) * (v % (step * 2) === 0 ? 72 : 77);
    const y2 = 100 - Math.cos(a) * (v % (step * 2) === 0 ? 72 : 77);
    const lx = 100 + Math.sin(a) * 63;
    const ly = 100 - Math.cos(a) * 63;
    ticks.push(
      <g key={v}>
        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--dim)" strokeWidth={v % (step * 2) === 0 ? 2 : 1} />
        {v % (step * 2) === 0 && (
          <text x={lx} y={ly + 3} textAnchor="middle" fontSize="8.5" fill="var(--dim)" className="num">{v}</text>
        )}
      </g>
    );
  }

  const needleA = (frac * SWEEP - 135) * (Math.PI / 180);
  const nx = 100 + Math.sin(needleA) * 52;
  const ny = 100 - Math.cos(needleA) * 52;

  return (
    <div className="relative mx-auto w-full max-w-[300px]">
      <svg viewBox="0 0 200 200" className="w-full" role="img" aria-label={`Speed ${Math.round(speed)} kilometres per hour, ${zone.label}`}>
        {/* track */}
        <circle cx="100" cy="100" r="88" pathLength={100} fill="none" stroke="var(--line)" strokeWidth="9"
          strokeDasharray={`${(SWEEP / 360) * 100} 100`} strokeLinecap="round" transform="rotate(135 100 100)" />
        {/* zones */}
        <circle cx="100" cy="100" r="88" pathLength={100} fill="none" stroke="var(--green)" strokeWidth="9" strokeOpacity="0.8"
          strokeDasharray={`${pct(cautionStart)} 100`} transform="rotate(135 100 100)" />
        <circle cx="100" cy="100" r="88" pathLength={100} fill="none" stroke="var(--amber)" strokeWidth="9" strokeOpacity="0.85"
          strokeDasharray={`${Math.max(0, pct(limit) - pct(cautionStart))} 100`} strokeDashoffset={-pct(cautionStart)} transform="rotate(135 100 100)" />
        <circle cx="100" cy="100" r="88" pathLength={100} fill="none" stroke="var(--red)" strokeWidth="9" strokeOpacity="0.85"
          strokeDasharray={`${Math.max(0, (SWEEP / 360) * 100 - pct(limit))} 100`} strokeDashoffset={-pct(limit)} transform="rotate(135 100 100)" strokeLinecap="round" />
        {/* live arc */}
        <circle cx="100" cy="100" r="79" pathLength={100} fill="none" stroke={zone.color} strokeWidth="4"
          className="gauge-arc" strokeLinecap="round"
          strokeDasharray={`${Math.max(0.5, (frac * SWEEP) / 360 * 100)} 100`} transform="rotate(135 100 100)"
          style={{ filter: `drop-shadow(0 0 6px ${zone.color})` }} />
        {ticks}
        {/* needle */}
        <line x1="100" y1="100" x2={nx} y2={ny} stroke={zone.color} strokeWidth="2.6" strokeLinecap="round"
          style={{ transition: "stroke 0.4s ease", filter: `drop-shadow(0 0 5px ${zone.color})` }} />
        <circle cx="100" cy="100" r="7" fill="var(--panel3)" stroke={zone.color} strokeWidth="2" />
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-end pb-4">
        <div className="num text-[44px] font-bold leading-none" style={{ color: zone.color, textShadow: `0 0 22px ${zone.color}55` }}>
          {Math.round(shown)}
        </div>
        <div className="font-display text-[10px] tracking-[0.3em] text-[var(--muted)] mt-1">KM/H · SPEED</div>
      </div>
      <div className="mt-1 flex items-center justify-center gap-2">
        <span className="pill" style={{ color: zone.color, borderColor: zone.color }}>
          <span className="dot dot-live" /> {zone.label}
        </span>
        <span className="pill text-[var(--muted)]">LIMIT {limit} KM/H</span>
      </div>
    </div>
  );
}

/* ───────────────────────── Driver score ring ───────────────────────── */
export function ScoreGauge({ score, reasons }: { score: number; reasons: { ts: number; kind: string; impact: number }[] }) {
  const shown = useLerped(score, 0.08);
  const band = scoreBand(score);
  const C = 2 * Math.PI * 74;

  return (
    <div className="flex items-center gap-5">
      <div className="relative h-[150px] w-[150px] flex-none">
        <svg viewBox="0 0 170 170" className="h-full w-full -rotate-[220deg]">
          <circle cx="85" cy="85" r="74" fill="none" stroke="var(--line)" strokeWidth="11"
            strokeDasharray={`${C * (280 / 360)} ${C}`} strokeLinecap="round" />
          <circle cx="85" cy="85" r="74" fill="none" stroke={band.color} strokeWidth="11" strokeLinecap="round"
            className="score-arc"
            strokeDasharray={`${C * (280 / 360) * (Math.max(0, Math.min(100, shown)) / 100)} ${C}`}
            style={{ filter: `drop-shadow(0 0 8px ${band.color})` }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="num text-[40px] font-bold leading-none" style={{ color: band.color }}>
            {Math.round(shown)}
          </span>
          <span className="num text-[13px] text-[var(--dim)]">/100</span>
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="pill mb-3" style={{ color: band.color, borderColor: band.color }}>
          <span className="dot" /> {band.label.toUpperCase()}
        </div>
        <div className="card-title mb-2" style={{ fontSize: 10 }}>WHY IT CHANGED</div>
        {reasons.length === 0 ? (
          <p className="text-[12.5px] text-[var(--dim)]">No penalties this trip — clean driving.</p>
        ) : (
          <ul className="space-y-1.5">
            {reasons.slice(0, 4).map((r, i) => (
              <li key={i} className="flex items-center justify-between gap-2 text-[12.5px]">
                <span className="truncate text-[var(--muted)]">{labelFor(r.kind)}</span>
                <span className="num font-semibold text-[var(--red)]">{r.impact}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function labelFor(kind: string) {
  const map: Record<string, string> = {
    HARSH_ACCEL: "Harsh acceleration",
    HARSH_BRAKE: "Harsh braking",
    LEFT_TURN: "Left turn",
    RIGHT_TURN: "Right turn",
    OVERSPEED: "Overspeed",
    ACCIDENT: "Accident",
  };
  return map[kind] ?? kind;
}
