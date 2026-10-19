import { useMemo } from "react";
import { EventHistory } from "../components/EventHistory";
import { useDrive } from "../lib/store";
import { IconWarning } from "../components/icons";

export function EventsPage() {
  const s = useDrive();
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    s.events.forEach((e) => { c[e.kind] = (c[e.kind] ?? 0) + 1; });
    return c;
  }, [s.events]);

  const chips = [
    { k: "HARSH_ACCEL", label: "Harsh Accel", color: "var(--amber)" },
    { k: "HARSH_BRAKE", label: "Harsh Brake", color: "var(--orange)" },
    { k: "LEFT_TURN", label: "Left Turns", color: "var(--cyan)" },
    { k: "RIGHT_TURN", label: "Right Turns", color: "var(--blue)" },
    { k: "OVERSPEED", label: "Overspeed", color: "var(--red)" },
    { k: "ACCIDENT", label: "Accidents", color: "var(--red)" },
  ];

  return (
    <div className="space-y-4">
      <h1 className="font-display flex items-center gap-2 text-lg font-bold tracking-wide">
        <IconWarning size={18} className="text-[var(--amber)]" /> EVENT LOG
      </h1>

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {chips.map((c) => (
          <div key={c.k} className="card p-3 text-center transition-transform hover:-translate-y-0.5">
            <p className="num text-[22px] font-bold leading-none" style={{ color: (counts[c.k] ?? 0) > 0 ? c.color : "var(--dim)" }}>
              {counts[c.k] ?? 0}
            </p>
            <p className="font-display mt-1 text-[8.5px] font-semibold tracking-[0.16em] text-[var(--dim)]">{c.label.toUpperCase()}</p>
          </div>
        ))}
      </div>

      <EventHistory />
    </div>
  );
}
