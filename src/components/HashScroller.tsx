"use client";

import { useEffect } from "react";

interface HashScrollerProps {
  /** scrollIntoView block alignment. Default "start" (sections). Use "center"
   *  to focus a timeline card in the middle of the viewport. */
  block?: ScrollLogicalPosition;
}

/**
 * Reads the URL hash on mount (and on hashchange) and scrolls to the matching
 * element. Needed because Next.js App Router renders Server Components async —
 * the browser fires the native hash scroll before the DOM is ready.
 */
export function HashScroller({ block = "start" }: HashScrollerProps) {
  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Entry animations (animate-fade-in) shift cards for ~400ms — scrolling
    // during them lands at a slightly wrong offset, so wait them out.
    const settleDelay = reduceMotion ? 0 : 450;

    let attempts = 0;
    let rafId = 0;
    let timerId: ReturnType<typeof setTimeout> | null = null;

    function clearPending() {
      cancelAnimationFrame(rafId);
      if (timerId) {
        clearTimeout(timerId);
        timerId = null;
      }
      attempts = 0;
    }

    function tryScroll() {
      const hash = window.location.hash.slice(1);
      if (!hash) return;

      const target = document.getElementById(hash);
      if (target) {
        timerId = setTimeout(() => {
          target.scrollIntoView({
            behavior: reduceMotion ? "auto" : "smooth",
            block,
          });
        }, settleDelay);
        return;
      }
      if (attempts++ < 20) rafId = requestAnimationFrame(tryScroll);
    }

    function onHashChange() {
      clearPending();
      tryScroll();
    }

    tryScroll();
    window.addEventListener("hashchange", onHashChange);

    return () => {
      clearPending();
      window.removeEventListener("hashchange", onHashChange);
    };
  }, [block]);

  return null;
}
