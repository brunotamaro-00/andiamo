"use client";

import { useId } from "react";
import { motion } from "motion/react";
import { springNav } from "@/lib/motion";

interface SegmentedOption<V extends string> {
  value: V;
  label: React.ReactNode;
}

/** Two-to-four mutually exclusive options as a pill group; the active thumb
 *  slides between segments (layoutId scoped per instance via useId). */
export function SegmentedControl<V extends string>({
  options,
  value,
  onChange,
  label,
  className = "",
}: {
  options: SegmentedOption<V>[];
  value: V;
  onChange: (value: V) => void;
  label: string;
  className?: string;
}) {
  const layoutId = useId();
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`flex gap-1 p-1 bg-surface-2 border border-border rounded-full ${className}`}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={[
              "relative flex-1 min-h-[36px] px-3 rounded-full text-xs font-extrabold uppercase tracking-[0.08em]",
              "transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick/40",
              active ? "text-surface" : "text-ink-2 hover:text-ink",
            ].join(" ")}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                transition={springNav}
                className="absolute inset-0 rounded-full bg-ink"
                aria-hidden="true"
              />
            )}
            <span className="relative inline-flex items-center justify-center gap-1.5">
              {opt.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
