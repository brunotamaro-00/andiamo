"use client";

import { useEffect } from "react";

/**
 * Reads the URL hash on mount and scrolls to the matching element.
 * Needed because Next.js App Router renders Server Components async —
 * the browser fires the native hash scroll before the DOM is ready.
 */
export function HashScroller() {
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Entry animations (animate-fade-in) shift cards for ~400ms — scrolling
    // during them lands at a slightly wrong offset, so wait them out.
    const settleDelay = reduceMotion ? 0 : 450;

    let attempts = 0;
    let rafId = 0;
    let timerId: ReturnType<typeof setTimeout> | null = null;

    function tryScroll() {
      const target = document.getElementById(hash);
      if (target) {
        timerId = setTimeout(() => {
          target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
        }, settleDelay);
        return;
      }
      if (attempts++ < 20) rafId = requestAnimationFrame(tryScroll);
    }

    tryScroll();

    return () => {
      cancelAnimationFrame(rafId);
      if (timerId) clearTimeout(timerId);
    };
  }, []);

  return null;
}
