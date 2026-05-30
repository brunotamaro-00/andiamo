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

    const el = document.getElementById(hash);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    // Element not in DOM yet — wait one frame and retry a few times.
    let attempts = 0;
    const id = setInterval(() => {
      attempts++;
      const target = document.getElementById(hash);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        clearInterval(id);
      } else if (attempts > 20) {
        clearInterval(id);
      }
    }, 100);

    return () => clearInterval(id);
  }, []);

  return null;
}
