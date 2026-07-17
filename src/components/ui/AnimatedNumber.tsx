"use client";

import { useEffect, useRef } from "react";
import { animate, useReducedMotion } from "motion/react";

/** Count-up for editorial numerals. Writes textContent imperatively (no
 *  re-renders / relayout — pair with font-tabular). Initial content is the
 *  final value so SSR, screen readers and reduced-motion all read correctly. */
export function AnimatedNumber({
  value,
  className,
  duration = 0.7,
}: {
  value: number;
  className?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const last = useRef(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduced) {
      el.textContent = String(value);
      last.current = value;
      return;
    }
    const controls = animate(last.current, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        el.textContent = String(Math.round(v));
      },
    });
    last.current = value;
    return () => controls.stop();
  }, [value, duration, reduced]);

  return (
    <span ref={ref} className={className}>
      {value}
    </span>
  );
}
