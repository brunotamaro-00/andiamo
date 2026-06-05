"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { RotateCcw } from "lucide-react";
import type { CityPoint, Segment } from "@/lib/map-projection";

interface Props {
  countryPaths: string[];
  cities: CityPoint[];
  segments: Segment[];
  viewBoxWidth: number;
  viewBoxHeight: number;
}

interface Transform {
  x: number;
  y: number;
  scale: number;
}

const MIN_SCALE = 1;   // scale=1 shows 100% of the map — can't zoom out further
const MAX_SCALE = 5;
const INITIAL: Transform = { x: 0, y: 0, scale: 1 };

/** Clamp pan so the map always fills the viewport (no empty canvas visible). */
function clamp(t: Transform, vbW: number, vbH: number): Transform {
  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, t.scale));
  const x = Math.min(0, Math.max((1 - scale) * vbW, t.x));
  const y = Math.min(0, Math.max((1 - scale) * vbH, t.y));
  return { x, y, scale };
}

export function TripMap({
  countryPaths,
  cities,
  segments,
  viewBoxWidth,
  viewBoxHeight,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [transform, setTransform] = useState<Transform>(INITIAL);
  const dragRef = useRef<{ startX: number; startY: number; tx: number; ty: number } | null>(null);
  const lastPinchRef = useRef<number | null>(null);
  const prefersReduced = useRef(
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  // ── Wheel zoom — zoom toward cursor position ────────────────────────────────
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.07 : 1 / 1.07;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    // Cursor position in viewBox coordinates
    const cx = ((e.clientX - rect.left) / rect.width) * viewBoxWidth;
    const cy = ((e.clientY - rect.top) / rect.height) * viewBoxHeight;
    setTransform((t) => {
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, t.scale * factor));
      // Adjust translate so the point under the cursor stays fixed
      const newX = cx - (cx - t.x) * (newScale / t.scale);
      const newY = cy - (cy - t.y) * (newScale / t.scale);
      return clamp({ x: newX, y: newY, scale: newScale }, viewBoxWidth, viewBoxHeight);
    });
  }, [viewBoxWidth, viewBoxHeight]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    svg.addEventListener("wheel", handleWheel, { passive: false });
    return () => svg.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  // ── Mouse drag ───────────────────────────────────────────────────────────────
  const onMouseDown = (e: React.MouseEvent) => {
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      tx: transform.x,
      ty: transform.y,
    };
  };

  const onMouseMove = (e: React.MouseEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    setTransform((t) => clamp({ ...t, x: drag.tx + dx, y: drag.ty + dy }, viewBoxWidth, viewBoxHeight));
  };

  const onMouseUp = () => { dragRef.current = null; };

  // ── Touch drag + pinch ───────────────────────────────────────────────────────
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      dragRef.current = {
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY,
        tx: transform.x,
        ty: transform.y,
      };
      lastPinchRef.current = null;
    } else if (e.touches.length === 2) {
      dragRef.current = null;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastPinchRef.current = Math.hypot(dx, dy);
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    const drag = dragRef.current;
    if (e.touches.length === 1 && drag) {
      const dx = e.touches[0].clientX - drag.startX;
      const dy = e.touches[0].clientY - drag.startY;
      setTransform((t) => clamp({ ...t, x: drag.tx + dx, y: drag.ty + dy }, viewBoxWidth, viewBoxHeight));
    } else if (e.touches.length === 2 && lastPinchRef.current != null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      // Dampen pinch sensitivity — raw ratio feels too fast on touch
      const rawFactor = dist / lastPinchRef.current;
      const factor = rawFactor > 1 ? 1 + (rawFactor - 1) * 0.5 : 1 - (1 - rawFactor) * 0.5;
      lastPinchRef.current = dist;
      setTransform((t) => clamp({ ...t, scale: t.scale * factor }, viewBoxWidth, viewBoxHeight));
    }
  };

  const onTouchEnd = () => {
    dragRef.current = null;
    lastPinchRef.current = null;
  };

  const reset = () => setTransform(INITIAL);

  const animated = !prefersReduced.current;

  // Precompute label visibility: deduplicate by base name (strip parenthetical suffix)
  const cityLabelInfo = (() => {
    const seen = new Set<string>();
    return new Map(cities.map((city) => {
      const baseKey = city.name.toLowerCase().replace(/\s*\(.*\)\s*$/, "").trim();
      const show = !seen.has(baseKey);
      if (show) seen.add(baseKey);
      const displayName = city.name.replace(/\s*\(.*\)\s*$/, "").trim();
      return [city.slug, { show, displayName }] as const;
    }));
  })();

  return (
    <div className="relative w-full h-full min-h-0 select-none" style={{ touchAction: "none" }}>
      {/* SVG map */}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        preserveAspectRatio="xMidYMid slice"
        className="w-full h-full cursor-grab active:cursor-grabbing"
        aria-label="Mapa del trayecto del viaje"
        role="img"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <g transform={`translate(${transform.x},${transform.y}) scale(${transform.scale})`}>
          {/* ── Layer 1: Country fills ────────────────────────────────────── */}
          <g aria-hidden="true">
            {countryPaths.map((d, i) => (
              <path
                key={i}
                d={d}
                fill="#EAE2CB"   /* surface-2 / canvas tint */
                stroke="#D8CFB4" /* border */
                strokeWidth={0.6}
              />
            ))}
          </g>

          {/* ── Layer 2: Segments (connections between cities) ────────────── */}
          <g aria-hidden="true">
            {segments.map((seg, i) => (
              <g key={`seg-${i}`}>
                {seg.mode === "flight" ? (
                  <path
                    d={seg.d}
                    fill="none"
                    stroke="#C44428" /* brick */
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    strokeLinecap="round"
                    opacity={0.7}
                    className={animated ? `animate-fade-in stagger-${Math.min((i % 6) + 1, 6)}` : ""}
                  />
                ) : (
                  <path
                    d={seg.d}
                    fill="none"
                    stroke="#C44428" /* brick */
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    opacity={0.55}
                    className={animated ? `animate-fade-in stagger-${Math.min((i % 6) + 1, 6)}` : ""}
                  />
                )}
              </g>
            ))}
          </g>

          {/* ── Layer 2b: Flight icons at midpoints ───────────────────────── */}
          {segments
            .filter((seg) => seg.mode === "flight")
            .map((seg, i) => (
              <g
                key={`icon-${i}`}
                transform={`translate(${seg.mx - 7},${seg.my - 7})`}
                aria-hidden="true"
                className={animated ? `animate-fade-in stagger-${Math.min((i % 6) + 1, 6)}` : ""}
              >
                {/* Small white bg pill for readability */}
                <circle cx="7" cy="7" r="7" fill="#FFFFFF" opacity={0.85} />
                {/* Plane icon — manually inlined at 14×14 to avoid client deps */}
                <svg x="0" y="0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#C44428" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21 4 19 2c-2-2-4-2-5.5-.5L10 5 1.8 6.2c-.5.1-.9.6-.6 1.1l1.5 2.8c.2.4.7.6 1.1.5L8 10l-2 4H4l-1 1 3 2 2 3 1-1v-2l4-2-.4 3.8c-.1.4.1.9.5 1.1l2.8 1.5c.5.3 1 0 1.1-.6z" />
                </svg>
              </g>
            ))}

          {/* ── Layer 3: City nodes ───────────────────────────────────────── */}
          {cities.map((city, i) => {
            const R = 7;
            const stagger = `stagger-${Math.min((i % 6) + 1, 6)}`;

            // Pick the best label angle from 16 candidates by maximising the
            // minimum distance from any nearby dot to the candidate label position.
            // "Maximin" criterion: choose the direction with the most open space.
            const NEAR_RADIUS = 80;
            const LDIST = R + 9;
            const nearby = cities.filter(
              (c) => c.slug !== city.slug && Math.hypot(c.x - city.x, c.y - city.y) < NEAR_RADIUS
            );
            let bestAngle = 0; // default: straight down (angle=0 → +y in SVG)
            if (nearby.length > 0) {
              let bestScore = -Infinity;
              const NUM = 16;
              for (let k = 0; k < NUM; k++) {
                const angle = (k * 2 * Math.PI) / NUM;
                const clx = city.x + Math.sin(angle) * LDIST;
                const cly = city.y + Math.cos(angle) * LDIST;
                // Maximin: maximise the closest approach distance
                const score = Math.min(...nearby.map((n) => Math.hypot(n.x - clx, n.y - cly)));
                if (score > bestScore) { bestScore = score; bestAngle = angle; }
              }
            }
            const ldx = Math.sin(bestAngle);
            const ldy = Math.cos(bestAngle);
            const lx = city.x + ldx * LDIST;
            const ly = city.y + ldy * LDIST;
            const anchor = ldx < -0.35 ? "end" : ldx > 0.35 ? "start" : "middle";

            return (
              <g
                key={city.slug}
                className={animated ? `animate-fade-in ${stagger}` : ""}
              >
                {/* Hard shadow */}
                <circle cx={city.x + 1} cy={city.y + 1} r={R} fill="#1B1A17" opacity={0.15} />
                {/* White dot */}
                <circle cx={city.x} cy={city.y} r={R} fill="#FFFFFF" stroke="#C44428" strokeWidth={1.8} />
                {/* Order number */}
                <text
                  x={city.x}
                  y={city.y + 3}
                  textAnchor="middle"
                  fontSize={7}
                  fontFamily="var(--font-archivo)"
                  fontWeight={900}
                  fill="#832C18"
                >
                  {i + 1}
                </text>
                {/* City name label — deduplicated by base name */}
                {cityLabelInfo.get(city.slug)?.show && (
                  <text
                    x={lx}
                    y={ly + (ldy > 0.3 ? 4 : ldy < -0.3 ? -2 : 2)}
                    textAnchor={anchor}
                    dominantBaseline="middle"
                    fontSize={7}
                    fontFamily="var(--font-anton)"
                    fontWeight={400}
                    fill="#1B1A17"
                    letterSpacing={0.2}
                    style={{ textTransform: "uppercase" }}
                    paintOrder="stroke"
                    stroke="#F3ECD8"
                    strokeWidth={2.5}
                  >
                    {cityLabelInfo.get(city.slug)?.displayName}
                  </text>
                )}
                {/* Invisible hit area for link */}
                <foreignObject
                  x={city.x - R - 2}
                  y={city.y - R - 2}
                  width={(R + 2) * 2}
                  height={(R + 2) * 2}
                  style={{ overflow: "visible" }}
                >
                  <Link
                    href={`/stops/${city.slug}`}
                    aria-label={`Ver ${city.name}`}
                    className="block w-full h-full opacity-0 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-brick rounded-full"
                    style={{ display: "block", width: "100%", height: "100%" }}
                  />
                </foreignObject>
              </g>
            );
          })}
        </g>
      </svg>

      {/* Reset button */}
      <button
        onClick={reset}
        aria-label="Restablecer vista del mapa"
        className="absolute bottom-20 right-4 w-10 h-10 rounded-full bg-surface border-2 border-border-strong flex items-center justify-center card-shadow hover:border-brick hover:text-brick text-ink-2 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick/40"
      >
        <RotateCcw size={15} strokeWidth={1.5} aria-hidden="true" />
      </button>

      {/* Legend */}
      <div className="absolute bottom-20 left-4 flex flex-col gap-1.5 bg-surface/90 backdrop-blur-sm border border-border rounded-[4px] px-3 py-2 card-shadow">
        <div className="flex items-center gap-2">
          <svg width="24" height="8" aria-hidden="true">
            <line x1="0" y1="4" x2="24" y2="4" stroke="#C44428" strokeWidth="1.5" strokeDasharray="4 3" />
          </svg>
          <span className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-ink-3">Vuelo</span>
        </div>
        <div className="flex items-center gap-2">
          <svg width="24" height="8" aria-hidden="true">
            <line x1="0" y1="4" x2="24" y2="4" stroke="#C44428" strokeWidth="1.5" />
          </svg>
          <span className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-ink-3">Auto / Tren</span>
        </div>
      </div>
    </div>
  );
}
