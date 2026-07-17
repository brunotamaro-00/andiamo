"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { haptics } from "./haptics";

const THRESHOLD_PX = 70;
const MAX_PULL_PX = 110;

/** Pull-to-refresh on #scroll-root. Only arms when the container is scrolled
 *  to the very top; native scrolling wins otherwise. Returns the live pull
 *  offset (for the spinner) and whether a refresh is in flight. */
export function usePullToRefresh() {
  const router = useRouter();
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const refreshingRef = useRef(false);

  useEffect(() => {
    const root = document.getElementById("scroll-root");
    if (!root) return;

    let startY = 0;
    let pulling = false;

    function onTouchStart(e: TouchEvent) {
      if (refreshingRef.current || root!.scrollTop > 0) return;
      startY = e.touches[0].clientY;
      pulling = true;
    }

    function onTouchMove(e: TouchEvent) {
      if (!pulling || refreshingRef.current) return;
      const dy = e.touches[0].clientY - startY;
      if (dy <= 0 || root!.scrollTop > 0) {
        setPull(0);
        return;
      }
      // Rubber-band: diminishing returns past the threshold
      setPull(Math.min(dy * 0.5, MAX_PULL_PX));
    }

    function onTouchEnd() {
      if (!pulling) return;
      pulling = false;
      setPull((current) => {
        if (current >= THRESHOLD_PX * 0.5 && !refreshingRef.current) {
          refreshingRef.current = true;
          setRefreshing(true);
          haptics.success();
          router.refresh();
          // router.refresh() gives no completion signal — hold the spinner
          // briefly so the gesture reads as "did something".
          setTimeout(() => {
            refreshingRef.current = false;
            setRefreshing(false);
          }, 900);
        }
        return 0;
      });
    }

    root.addEventListener("touchstart", onTouchStart, { passive: true });
    root.addEventListener("touchmove", onTouchMove, { passive: true });
    root.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      root.removeEventListener("touchstart", onTouchStart);
      root.removeEventListener("touchmove", onTouchMove);
      root.removeEventListener("touchend", onTouchEnd);
    };
  }, [router]);

  return { pull, refreshing };
}
