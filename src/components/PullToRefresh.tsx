"use client";

import { Loader2, ArrowDown } from "lucide-react";
import { usePullToRefresh } from "@/lib/use-pull-to-refresh";

/** Thin client wrapper mounted only on /hoy: weather/spend go stale with
 *  staleTimes + SW SWR, and the natural mobile gesture to re-check is pulling
 *  down. Renders just the indicator — the page itself stays a RSC. */
export function PullToRefresh() {
  const { pull, refreshing } = usePullToRefresh();

  if (pull === 0 && !refreshing) return null;

  return (
    <div
      aria-live="polite"
      className="sticky top-[calc(2.75rem+env(safe-area-inset-top))] z-[9] flex justify-center pointer-events-none"
      style={{ height: 0 }}
    >
      <div
        className="mt-2 flex items-center justify-center w-9 h-9 rounded-full bg-surface border border-border card-shadow"
        style={{
          transform: `translateY(${refreshing ? 8 : Math.min(pull, 48) - 36}px)`,
          opacity: refreshing ? 1 : Math.min(pull / 35, 1),
          transition: refreshing ? "transform 150ms ease" : undefined,
        }}
      >
        {refreshing ? (
          <>
            <Loader2 size={16} strokeWidth={2} className="animate-spin text-brick" aria-hidden="true" />
            <span className="sr-only">Actualizando</span>
          </>
        ) : (
          <ArrowDown
            size={16}
            strokeWidth={2}
            className="text-ink-3"
            aria-hidden="true"
            style={{ transform: `rotate(${pull >= 35 ? 180 : 0}deg)`, transition: "transform 150ms ease" }}
          />
        )}
      </div>
    </div>
  );
}
