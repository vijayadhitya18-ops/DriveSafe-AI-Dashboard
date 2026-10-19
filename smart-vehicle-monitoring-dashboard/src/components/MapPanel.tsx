import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { store, useDrive, useNow } from "../lib/store";
import { fmtCoord, fmtDuration, fmtKm, googleMapsUrl } from "../lib/utils";
import { IconCrosshair, IconExternal, IconTrash } from "./icons";

const CAR_SVG = `
<svg viewBox="0 0 40 40" width="34" height="34" xmlns="http://www.w3.org/2000/svg">
  <circle cx="20" cy="20" r="18" fill="rgba(62,198,232,0.12)" stroke="rgba(62,198,232,0.5)" stroke-width="1.5"/>
  <path d="M20 7 L27 27 L20 22.5 L13 27 Z" fill="#3ec6e8" stroke="#0b1118" stroke-width="1.4" stroke-linejoin="round"/>
</svg>`;

interface Props {
  className?: string;
  /** "live" follows the vehicle; "static" pins a single accident location */
  mode?: "live" | "static";
  staticLat?: number | null;
  staticLng?: number | null;
  height?: string;
  showControls?: boolean;
}

export function MapPanel({ className = "", mode = "live", staticLat = null, staticLng = null, height = "380px", showControls = true }: Props) {
  const s = useDrive();
  useNow(1000);
  const divRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const lineRef = useRef<L.Polyline | null>(null);
  const accRef = useRef<L.Circle | null>(null);
  const [follow, setFollow] = useState(s.settings.mapTracking);
  const [mapFailed, setMapFailed] = useState(false);

  const p = s.packet;
  const hasFix = mode === "static" ? staticLat !== null && staticLng !== null : (p?.gpsFix ?? false);
  const lat = mode === "static" ? staticLat : p?.latitude ?? null;
  const lng = mode === "static" ? staticLng : p?.longitude ?? null;

  const theme = s.settings.theme;

  /* init */
  useEffect(() => {
    if (!divRef.current || mapRef.current) return;
    try {
      const map = L.map(divRef.current, { zoomControl: false, attributionControl: true, center: [lat ?? 20, lng ?? 78], zoom: 15 });
      L.control.zoom({ position: "bottomright" }).addTo(map);
      // Light base tiles — the CSS `--tile-filter` variable darkens them in dark theme
      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        maxZoom: 19,
        subdomains: "abcd",
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; CARTO',
      }).on("tileerror", () => setMapFailed(true)).addTo(map);

      if (mode === "live") {
        lineRef.current = L.polyline([], { color: "#3ec6e8", weight: 3.5, opacity: 0.85 }).addTo(map);
      }
      const icon = L.divIcon({
        className: "vehicle-marker",
        html: `<div style="position:relative;width:34px;height:34px"><span class="vehicle-ping"></span>${CAR_SVG}</div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });
      markerRef.current = L.marker([lat ?? 0, lng ?? 0], { icon }).addTo(map);
      if (!hasFix) markerRef.current.setOpacity(0);
      accRef.current = L.circle([lat ?? 0, lng ?? 0], { radius: 0, color: "#3ec6e8", weight: 1, fillOpacity: 0.07 }).addTo(map);
      mapRef.current = map;

      map.on("dragstart", () => setFollow(false));
      const ro = new ResizeObserver(() => map.invalidateSize());
      ro.observe(divRef.current);
      setTimeout(() => map.invalidateSize(), 60);
      return () => {
        ro.disconnect();
        map.remove();
        mapRef.current = null;
        markerRef.current = null;
        lineRef.current = null;
        accRef.current = null;
      };
    } catch {
      setMapFailed(true);
      return;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, theme]);

  /* live updates */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !hasFix || lat === null || lng === null) {
      markerRef.current?.setOpacity(0);
      return;
    }
    const m = markerRef.current!;
    m.setOpacity(1);
    m.setLatLng([lat, lng]);
    const el = m.getElement()?.querySelector("svg");
    if (el && p?.heading !== null && p?.heading !== undefined && mode === "live") {
      (el as SVGElement).style.transform = `rotate(${p.heading}deg)`;
    }
    if (accRef.current) {
      accRef.current.setLatLng([lat, lng]);
      accRef.current.setRadius(p?.accuracy ? Math.max(6, p.accuracy) : 0);
    }
    if (mode === "live" && lineRef.current) lineRef.current.setLatLngs(s.path);
    if (follow || mode === "static") map.panTo([lat, lng], { animate: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng, s.path, hasFix, follow, mode]);

  const gmaps = lat !== null && lng !== null ? googleMapsUrl(lat, lng) : null;
  const duration = s.tripRunning && s.tripStartedAt ? Date.now() - s.tripStartedAt : 0;

  return (
    <section className={`card relative overflow-hidden p-0 rise-in ${className}`} aria-label="Live vehicle map" style={{ height }}>
      <div ref={divRef} className="absolute inset-0 z-0" />

      {/* header chips */}
      <div className="pointer-events-none absolute left-3 top-3 z-[800] flex flex-col gap-1.5">
        <span className="pill !bg-[rgba(7,11,16,0.82)] !text-[10px]" style={{ color: "var(--cyan)", borderColor: "rgba(62,198,232,0.5)" }}>
          <span className="dot dot-live" /> {mode === "static" ? "ACCIDENT LOCATION" : "LIVE VEHICLE PATH"}
        </span>
        {lat !== null && lng !== null && (
          <span className="pill num !bg-[rgba(7,11,16,0.82)] !text-[10px] text-[var(--muted)]">
            {fmtCoord(lat)}, {fmtCoord(lng)}
          </span>
        )}
        {mode === "live" && (
          <span className="pill num !bg-[rgba(7,11,16,0.82)] !text-[10px] text-[var(--muted)]">
            {fmtKm(s.tripDistanceKm)} · {fmtDuration(duration)} {p?.accuracy ? `· ±${p.accuracy.toFixed(0)} m` : ""}
          </span>
        )}
      </div>

      {/* no-fix overlay */}
      {!hasFix && (
        <div className="absolute inset-0 z-[700] flex items-center justify-center bg-[rgba(7,11,16,0.55)]">
          <div className="card flex items-center gap-3 px-5 py-4" role="status">
            <span className="dot h-2.5 w-2.5 blink-soft" style={{ color: "var(--amber)" }} />
            <div>
              <p className="font-display text-[13px] font-bold tracking-[0.15em] text-[var(--amber)]">GPS SIGNAL LOST</p>
              <p className="text-[12px] text-[var(--muted)]">Waiting for GPS fix…</p>
            </div>
          </div>
        </div>
      )}
      {mapFailed && (
        <div className="absolute inset-0 z-[690] flex items-center justify-center bg-[var(--bg1)]">
          <p className="px-6 text-center text-[12.5px] text-[var(--muted)]">
            Map tiles unavailable (offline?). Coordinates and the Google Maps link below still work.
          </p>
        </div>
      )}

      {/* controls */}
      {showControls && (
        <div className="absolute bottom-3 left-3 right-14 z-[800] flex flex-wrap items-center gap-1.5">
          {mode === "live" && (
            <>
              <button className="btn !bg-[rgba(7,11,16,0.85)] !px-2.5 !py-1.5 !text-[10px]" onClick={() => { setFollow(true); }} aria-pressed={follow}>
                <IconCrosshair size={12} /> CENTER VEHICLE
              </button>
              <button className="btn !bg-[rgba(7,11,16,0.85)] !px-2.5 !py-1.5 !text-[10px]" onClick={() => store.clearPath()}>
                <IconTrash size={12} /> CLEAR ROUTE
              </button>
            </>
          )}
          <a
            className="btn btn-amber !px-2.5 !py-1.5 !text-[10px] no-underline"
            href={gmaps ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={!gmaps}
            onClick={(e) => { if (!gmaps) e.preventDefault(); }}
          >
            <IconExternal size={12} /> OPEN IN GOOGLE MAPS
          </a>
        </div>
      )}
    </section>
  );
}
