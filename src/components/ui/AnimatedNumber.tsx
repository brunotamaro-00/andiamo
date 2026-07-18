"use client";

import { useEffect, useRef } from "react";
import { animate, useReducedMotion } from "motion/react";
import { easeSmooth } from "@/lib/motion";

/** Count-up for editorial numerals. Writes textContent imperatively (no
 *  re-renders / relayout — pair with font-tabular). Initial content is the
 *  final value so SSR, screen readers and reduced-motion all read correctly.
 *
 *  `decimals` fixes the display precision (e.g. `2` for currency so decimals
 *  survive the tween); omit it to round to an integer. Kept as a plain number
 *  rather than a formatter fn so the prop stays serializable across the
 *  Server → Client boundary — these count-ups are used inside RSC pages. */
export function AnimatedNumber({
  value,
  className,
  duration = 0.7,
  decimals,
}: {
  value: number;
  className?: string;
  duration?: number;
  decimals?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const last = useRef(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fmt = (n: number) =>
      decimals !== undefined ? n.toFixed(decimals) : String(Math.round(n));
    if (reduced) {
      el.textContent = fmt(value);
      last.current = value;
      return;
    }
    const controls = animate(last.current, value, {
      duration,
      ease: easeSmooth,
      onUpdate: (v) => {
        el.textContent = fmt(v);
      },
    });
    last.current = value;
    return () => controls.stop();
  }, [value, duration, reduced, decimals]);

  return (
    <span ref={ref} className={className}>
      {decimals !== undefined ? value.toFixed(decimals) : Math.round(value)}
    </span>
  );
}
