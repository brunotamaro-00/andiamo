"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { RotateCcw } from "lucide-react";
import type { CityPoint, Segment } from "@/lib/map-projection";

// ── Color tokens by stop state ────────────────────────────────────────────
const STATE_COLORS = {
  upcoming: {
    dotStroke: "#8A7F6A",   // ink-3
    dotFill:   "#FFFFFF",
    numFill:   "#8A7F6A",   // ink-3
    labelFill: "#8A7F6A",   // ink-3
  },
  visited: {
    dotStroke: "#C44428",   // brick
    dotFill:   "#FFFFFF",
    numFill:   "#832C18",   // brick-ink
    labelFill: "#1B1A17",   // ink
  },
  current: {
    dotStroke: "#C8A24B",   // gold
    dotFill:   "#F8F0DC",   // gold-bg
    numFill:   "#7A5C10",   // gold-ink
    labelFill: "#1B1A17",   // ink
  },
} as const;

const SEG_STROKE = {
  traveled: { stroke: "#C44428", opacity: 0.7  },  // brick
  upcoming:  { stroke: "#ABA090", opacity: 0.45 },  // ink-faint
} as const;

// ── Pan/zoom constants ────────────────────────────────────────────────────
const MIN_SCALE = 1;
const MAX_SCALE = 5;
const INITIAL = { x: 0, y: 0, scale: 1 };

interface Props {
  countryPaths: string[];
  cities: CityPoint[];
  segments: Segment[];
  viewBoxWidth: number;
  viewBoxHeight: number;
}

interface Transform { x: number; y: number; scale: number; }

/** Clamp pan so the map always fills the viewport (no empty canvas). */
function clamp(t: Transform, vbW: number, vbH: number): Transform {
  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, t.scale));
  const x = Math.min(0, Math.max((1 - scale) * vbW, t.x));
  const y = Math.min(0, Math.max((1 - scale) * vbH, t.y));
  return { x, y, scale };
}

export function TripMap({ countryPaths, cities, segments, viewBoxWidth, viewBoxHeight }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [transform, setTransform] = useState<Transform>(INITIAL);
  const dragRef = useRef<{ startX: number; startY: number; tx: number; ty: number } | null>(null);
  const lastPinchRef = useRef<number | null>(null);
  const prefersReduced = useRef(
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  // ── Wheel zoom — zoom toward cursor ──────────────────────────────────────
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.07 : 1 / 1.07;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const cx = ((e.clientX - rect.left) / rect.width) * viewBoxWidth;
    const cy = ((e.clientY - rect.top) / rect.height) * viewBoxHeight;
    setTransform((t) => {
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, t.scale * factor));
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

  // ── Mouse drag ────────────────────────────────────────────────────────────
  const onMouseDown = (e: React.MouseEvent) => {
    dragRef.current = { startX: e.clientX, startY: e.clientY, tx: transform.x, ty: transform.y };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    setTransform((t) => clamp({ ...t, x: drag.tx + e.clientX - drag.startX, y: drag.ty + e.clientY - drag.startY }, viewBoxWidth, viewBoxHeight));
  };
  const onMouseUp = () => { dragRef.current = null; };

  // ── Touch drag + pinch ────────────────────────────────────────────────────
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      dragRef.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY, tx: transform.x, ty: transform.y };
      lastPinchRef.current = null;
    } else if (e.touches.length === 2) {
      dragRef.current = null;
      lastPinchRef.current = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    const drag = dragRef.current;
    if (e.touches.length === 1 && drag) {
      setTransform((t) => clamp({ ...t, x: drag.tx + e.touches[0].clientX - drag.startX, y: drag.ty + e.touches[0].clientY - drag.startY }, viewBoxWidth, viewBoxHeight));
    } else if (e.touches.length === 2 && lastPinchRef.current != null) {
      const t0 = e.touches[0];
      const t1 = e.touches[1];
      const dist = Math.hypot(t0.clientX - t1.clientX, t0.clientY - t1.clientY);
      const raw = dist / lastPinchRef.current;
      const factor = raw > 1 ? 1 + (raw - 1) * 0.5 : 1 - (1 - raw) * 0.5;
      lastPinchRef.current = dist;
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const cx = (((t0.clientX + t1.clientX) / 2 - rect.left) / rect.width) * viewBoxWidth;
      const cy = (((t0.clientY + t1.clientY) / 2 - rect.top) / rect.height) * viewBoxHeight;
      setTransform((t) => {
        const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, t.scale * factor));
        return clamp({ x: cx - (cx - t.x) * (newScale / t.scale), y: cy - (cy - t.y) * (newScale / t.scale), scale: newScale }, viewBoxWidth, viewBoxHeight);
      });
    }
  };

  const onTouchEnd = () => { dragRef.current = null; lastPinchRef.current = null; };
  const reset = () => setTransform(INITIAL);
  const animated = !prefersReduced.current;

  // ── Greedy label placement ────────────────────────────────────────────────
  // For each visible label, pick the angle (out of 16 candidates) that:
  //   1. Does NOT overlap any previously placed label bounding box (hard reject).
  //   2. Maximises the minimum clearance from nearby dots + close segment midpoints.
  // Falls back to plain maximin if all 16 angles are blocked.

  const LDIST = 7 + 14; // R + 14 = 21 SVG units from dot center
  const CHAR_W = 4.2;   // estimated Anton char width at fontSize=7
  const LABEL_HH = 4;   // half-height (7px text ≈ 8px → 4px)

  const seenNames  = new Set<string>();
  const placedBoxes: { cx: number; cy: number; hw: number; hh: number }[] = [];
  const segMids    = segments.map((s) => ({ x: s.mx, y: s.my }));

  const cityLabelMap = new Map<string, { show: boolean; displayName: string; lx: number; ly: number }>();

  for (const city of cities) {
    const baseKey     = city.name.toLowerCase().replace(/\s*\(.*\)\s*$/, "").trim();
    const displayName = city.name.replace(/\s*\(.*\)\s*$/, "").trim();
    const show        = !seenNames.has(baseKey);
    if (show) seenNames.add(baseKey);

    if (!show) { cityLabelMap.set(city.slug, { show: false, displayName, lx: 0, ly: 0 }); continue; }

    const hw     = (displayName.length * CHAR_W) / 2;
    const nearby = cities.filter((c) => c.slug !== city.slug && Math.hypot(c.x - city.x, c.y - city.y) < 80);

    const evalAngle = (angle: number, allowBoxOverlap: boolean): number => {
      const lx = city.x + Math.sin(angle) * LDIST;
      const ly = city.y + Math.cos(angle) * LDIST;
      if (!allowBoxOverlap) {
        for (const box of placedBoxes) {
          if (Math.abs(lx - box.cx) < hw + box.hw + 2 && Math.abs(ly - box.cy) < LABEL_HH + box.hh + 2) return -Infinity;
        }
      }
      const dotDists = nearby.map((n) => Math.hypot(n.x - lx, n.y - ly));
      const segDists = segMids.filter((m) => Math.hypot(m.x - lx, m.y - ly) < 40).map((m) => Math.hypot(m.x - lx, m.y - ly));
      const all = [...dotDists, ...segDists];
      return all.length > 0 ? Math.min(...all) : 100;
    };

    let bestAngle = Math.PI; // default: straight down
    let bestScore = -Infinity;

    for (let k = 0; k < 16; k++) {
      const angle = (k * 2 * Math.PI) / 16;
      const score = evalAngle(angle, false);
      if (score > bestScore) { bestScore = score; bestAngle = angle; }
    }
    // Fallback: ignore box overlaps (still better than nothing)
    if (bestScore === -Infinity) {
      for (let k = 0; k < 16; k++) {
        const angle = (k * 2 * Math.PI) / 16;
        const score = evalAngle(angle, true);
        if (score > bestScore) { bestScore = score; bestAngle = angle; }
      }
    }

    const lx = city.x + Math.sin(bestAngle) * LDIST;
    const ly = city.y + Math.cos(bestAngle) * LDIST;
    placedBoxes.push({ cx: lx, cy: ly, hw, hh: LABEL_HH });
    cityLabelMap.set(city.slug, { show: true, displayName, lx, ly });
  }

  return (
    <div className="relative w-full h-full min-h-0 select-none" style={{ touchAction: "none" }}>
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

          {/* ── Layer 1: Country fills ──────────────────────────────────── */}
          <g aria-hidden="true">
            {countryPaths.map((d, i) => (
              <path key={i} d={d} fill="#EAE2CB" stroke="#D8CFB4" strokeWidth={0.6} />
            ))}
          </g>

          {/* ── Layer 2: Segments ───────────────────────────────────────── */}
          <g aria-hidden="true">
            {segments.map((seg, i) => {
              const { stroke, opacity } = SEG_STROKE[seg.state];
              return (
                <path
                  key={`seg-${i}`}
                  d={seg.d}
                  fill="none"
                  stroke={stroke}
                  strokeWidth={1.5}
                  strokeDasharray={seg.mode === "flight" ? "4 4" : undefined}
                  strokeLinecap="round"
                  opacity={opacity}
                  className={animated ? `animate-fade-in stagger-${Math.min((i % 6) + 1, 6)}` : ""}
                />
              );
            })}
          </g>

          {/* ── Layer 2b: Flight icons ───────────────────────────────────── */}
          {segments
            .filter((seg) => seg.mode === "flight")
            .map((seg, i) => (
              <g
                key={`icon-${i}`}
                transform={`translate(${seg.mx - 7},${seg.my - 7})`}
                aria-hidden="true"
                className={animated ? `animate-fade-in stagger-${Math.min((i % 6) + 1, 6)}` : ""}
              >
                <circle cx="7" cy="7" r="7" fill="#FFFFFF" opacity={0.85} />
                <svg x="0" y="0" width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke={seg.state === "traveled" ? "#C44428" : "#ABA090"}
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                >
                  <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21 4 19 2c-2-2-4-2-5.5-.5L10 5 1.8 6.2c-.5.1-.9.6-.6 1.1l1.5 2.8c.2.4.7.6 1.1.5L8 10l-2 4H4l-1 1 3 2 2 3 1-1v-2l4-2-.4 3.8c-.1.4.1.9.5 1.1l2.8 1.5c.5.3 1 0 1.1-.6z" />
                </svg>
              </g>
            ))}

          {/* ── Layer 3: City nodes ─────────────────────────────────────── */}
          {cities.map((city, i) => {
            const R   = 7;
            const col = STATE_COLORS[city.state];
            const stagger   = `stagger-${Math.min((i % 6) + 1, 6)}`;
            const placement = cityLabelMap.get(city.slug);

            return (
              <g key={city.slug} className={animated ? `animate-fade-in ${stagger}` : ""}>
                {/* Pulse ring — current city only */}
                {city.state === "current" && (
                  <circle
                    cx={city.x} cy={city.y} r={R + 5}
                    fill="none"
                    stroke="#C8A24B"
                    strokeWidth={1.5}
                    opacity={animated ? undefined : 0.3}
                    className={animated ? "animate-map-pulse" : ""}
                  />
                )}
                {/* Hard shadow */}
                <circle cx={city.x + 1} cy={city.y + 1} r={R} fill="#1B1A17" opacity={0.12} />
                {/* Dot */}
                <circle
                  cx={city.x} cy={city.y} r={R}
                  fill={col.dotFill}
                  stroke={col.dotStroke}
                  strokeWidth={city.state === "current" ? 2.2 : 1.8}
                />
                {/* Order number */}
                <text
                  x={city.x} y={city.y + 3}
                  textAnchor="middle"
                  fontSize={7}
                  fontFamily="var(--font-archivo)"
                  fontWeight={900}
                  fill={col.numFill}
                >
                  {i + 1}
                </text>
                {/* City label */}
                {placement?.show && (
                  <text
                    x={placement.lx}
                    y={placement.ly}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={7}
                    fontFamily="var(--font-anton)"
                    fontWeight={400}
                    fill={col.labelFill}
                    letterSpacing={0.2}
                    style={{ textTransform: "uppercase" }}
                    paintOrder="stroke"
                    stroke="#F3ECD8"
                    strokeWidth={2.5}
                  >
                    {placement.displayName}
                  </text>
                )}
                {/* Invisible tap/click area */}
                <foreignObject
                  x={city.x - R - 2} y={city.y - R - 2}
                  width={(R + 2) * 2}  height={(R + 2) * 2}
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
