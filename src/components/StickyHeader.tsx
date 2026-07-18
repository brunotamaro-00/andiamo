"use client";

import { useEffect, useState } from "react";

/** Sticky top-bar shell that gains a soft shadow once the page scrolls, to
 *  separate the chrome from the content beneath it. Scroll happens on
 *  #scroll-root (the <main>), not window — see layout.tsx. Client-only, but
 *  reads no cookies/DB, so pages composing it (incl. SSG /guias) stay static. */
export function StickyHeader({ children }: { children: React.ReactNode }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const root = document.getElementById("scroll-root");
    if (!root) return;
    const onScroll = () => setScrolled(root.scrollTop > 4);
    onScroll();
    root.addEventListener("scroll", onScroll, { passive: true });
    return () => root.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={[
        "sticky top-0 z-10 bg-surface backdrop-blur-md border-b border-border-strong",
        "px-4 py-2 pt-[calc(0.5rem+env(safe-area-inset-top))]",
        "transition-shadow duration-150",
        scrolled ? "header-shadow" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </header>
  );
}
