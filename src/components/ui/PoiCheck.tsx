"use client";

import { Check } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { springPop } from "@/lib/motion";

/** Shared POI done-circle — one visual for TodayPoiList and PoiPanel.
 *  Pure visual span: the 44px touch target is the wrapping button.
 *  The check pops in with a small overshoot when the POI is marked done
 *  (reduced-motion falls back to a plain fade). Pass `hover` when the
 *  wrapper exposes a `group` class for hover feedback. */
export function PoiCheck({ done, hover = false }: { done: boolean; hover?: boolean }) {
  const reduced = useReducedMotion();
  return (
    <span
      aria-hidden="true"
      className={[
        "w-[22px] h-[22px] shrink-0 rounded-full border-2 flex items-center justify-center transition-colors duration-150",
        done
          ? "bg-success border-success text-surface"
          : `border-border-strong ${hover ? "group-hover:border-brick" : ""}`,
      ].join(" ")}
    >
      <AnimatePresence initial={false}>
        {done && (
          <motion.span
            key="check"
            className="flex"
            initial={reduced ? { opacity: 0 } : { scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={reduced ? { opacity: 0 } : { scale: 0.4, opacity: 0 }}
            transition={reduced ? { duration: 0.1 } : springPop}
          >
            <Check size={12} strokeWidth={3} />
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
