"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { RefreshCw } from "lucide-react";
import { haptics } from "@/lib/haptics";

/* Pull-to-refresh for the installed PWA: `display: standalone` disables the
 * browser's native gesture, so we reimplement it on #scroll-root. Pulling down
 * from the top past a threshold calls router.refresh() — the current route's
 * RSC is refetched from the network (network-only in the SW), so the user gets
 * fresh server data. Replaces a separate "Actualizar" button. */

const THRESHOLD = 70; // px of pull needed to trigger a refresh
const MAX_PULL = 96; // clamp so the indicator never drifts too far
// Safety net: router.refresh() inside a transition can leave `isPending` stuck
// true even after the data has refreshed, which would freeze the spinner and
// (via the touchstart guard) disable pull-to-refresh for good. This bounds the
// spinner so it always clears; the fast path below hides it as soon as the
// transition actually settles.
const WATCHDOG_MS = 6000;

export function PullToRefresh() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [pull, setPull] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Touch bookkeeping kept in refs so listeners stay stable across renders.
  const startY = useRef(0);
  const active = useRef(false); // began the drag while scrolled to the top
  const armedRef = useRef(false); // crossed the threshold this gesture
  const refreshingRef = useRef(false); // mirror of `refreshing` for listeners
  const watchdogRef = useRef<number | null>(null);
  const wasPending = useRef(false);

  function stopRefreshing() {
    if (watchdogRef.current !== null) {
      clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    }
    refreshingRef.current = false;
    setRefreshing(false);
  }

  // Fast path: clear the spinner the moment the refresh transition settles
  // (pending true → false). The watchdog covers the case where it never does.
  useEffect(() => {
    if (isPending) {
      wasPending.current = true;
    } else if (wasPending.current) {
      wasPending.current = false;
      stopRefreshing();
    }
  }, [isPending]);

  // Clear any pending watchdog on unmount.
  useEffect(() => () => {
    if (watchdogRef.current !== null) clearTimeout(watchdogRef.current);
  }, []);

  useEffect(() => {
    const scroller = document.getElementById("scroll-root");
    if (!scroller) return;

    function onTouchStart(e: TouchEvent) {
      // Only arm when already at the very top and not mid-refresh.
      if (scroller!.scrollTop > 0 || refreshingRef.current) {
        active.current = false;
        return;
      }
      active.current = true;
      armedRef.current = false;
      startY.current = e.touches[0].clientY;
      setDragging(true);
    }

    function onTouchMove(e: TouchEvent) {
      if (!active.current) return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta <= 0) {
        // Scrolling back up — hand control back to the native scroll.
        setPull(0);
        return;
      }
      // A page scrolled down between start and now: bail out.
      if (scroller!.scrollTop > 0) {
        active.current = false;
        setDragging(false);
        setPull(0);
        return;
      }
      // Rubber-band resistance past the threshold.
      const resisted = delta > THRESHOLD ? THRESHOLD + (delta - THRESHOLD) * 0.35 : delta;
      const clamped = Math.min(resisted, MAX_PULL);
      setPull(clamped);
      if (!armedRef.current && clamped >= THRESHOLD) {
        armedRef.current = true;
        haptics.tap();
      } else if (armedRef.current && clamped < THRESHOLD) {
        armedRef.current = false;
      }
      // Prevent the browser's overscroll/bounce while we drive the indicator.
      if (e.cancelable) e.preventDefault();
    }

    function onTouchEnd() {
      if (!active.current) return;
      active.current = false;
      setDragging(false);
      if (armedRef.current) {
        armedRef.current = false;
        haptics.success();
        refreshingRef.current = true;
        setRefreshing(true);
        if (watchdogRef.current !== null) clearTimeout(watchdogRef.current);
        watchdogRef.current = window.setTimeout(stopRefreshing, WATCHDOG_MS);
        startTransition(() => router.refresh());
      }
      setPull(0);
    }

    scroller.addEventListener("touchstart", onTouchStart, { passive: true });
    scroller.addEventListener("touchmove", onTouchMove, { passive: false });
    scroller.addEventListener("touchend", onTouchEnd, { passive: true });
    scroller.addEventListener("touchcancel", onTouchEnd, { passive: true });
    return () => {
      scroller.removeEventListener("touchstart", onTouchStart);
      scroller.removeEventListener("touchmove", onTouchMove);
      scroller.removeEventListener("touchend", onTouchEnd);
      scroller.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [router]);

  const armed = pull >= THRESHOLD;
  const active2 = pull > 0 || refreshing;
  // Indicator glides in with the pull, then parks at a fixed spot while refreshing.
  const translateY = refreshing ? 44 : pull;
  const progress = Math.min(pull / THRESHOLD, 1);

  return (
    <motion.div
      aria-hidden={!refreshing}
      className="pointer-events-none fixed inset-x-0 top-0 z-[1500] flex justify-center"
      style={{
        transform: `translateY(${translateY - 44}px)`,
        opacity: active2 ? 1 : 0,
        transition: dragging ? "none" : "transform 0.25s ease, opacity 0.2s ease",
      }}
    >
      <span
        className="mt-[calc(env(safe-area-inset-top)+8px)] grid h-9 w-9 place-items-center rounded-full border-2 border-ink bg-surface text-brick card-shadow"
        role="status"
        aria-label={refreshing ? "Actualizando" : undefined}
      >
        <RefreshCw
          size={16}
          strokeWidth={2.5}
          aria-hidden="true"
          className={refreshing ? "animate-spin" : ""}
          style={
            refreshing || reduceMotion
              ? undefined
              : { transform: `rotate(${progress * 270}deg)`, opacity: armed ? 1 : 0.55 }
          }
        />
      </span>
    </motion.div>
  );
}
