"use client";

import { useEffect } from "react";

interface HashScrollerProps {
  /** scrollIntoView block alignment. Default "start" (sections). Use "center"
   *  to focus a timeline card in the middle of the viewport. */
  block?: ScrollLogicalPosition;
  /** Element id to center when the URL has no hash — used to auto-focus the
   *  current stop on the itinerary. Fallback scrolls instantly (not smooth). */
  fallbackId?: string;
}

/**
 * Reads the URL hash on mount (and on hashchange) and scrolls to the matching
 * element. Needed because Next.js App Router renders Server Components async —
 * the browser fires the native hash scroll before the DOM is ready. When there
 * is no hash and `fallbackId` is set, it centers that element instead.
 */
export function HashScroller({ block = "start", fallbackId }: HashScrollerProps) {
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
      const id = hash || fallbackId;
      if (!id) return;
      // No hash → landing on the fallback: jump instantly, don't animate a long
      // scroll down a big list.
      const smooth = Boolean(hash) && !reduceMotion;

      const target = document.getElementById(id);
      if (target) {
        timerId = setTimeout(() => {
          target.scrollIntoView({
            behavior: smooth ? "smooth" : "auto",
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
  }, [block, fallbackId]);

  return null;
}
