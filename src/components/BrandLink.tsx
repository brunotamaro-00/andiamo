"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Wordmark wrapper: goes to /stops#current. When already on the itinerary,
 * Next soft-nav won't remount HashScroller or fire hashchange — scroll here.
 */
export function BrandLink({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (pathname !== "/stops") return;

    e.preventDefault();
    if (window.location.hash !== "#current") {
      window.history.pushState(null, "", "/stops#current");
    }
    const target = document.getElementById("current");
    if (!target) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "center",
    });
  }

  return (
    <Link
      href="/stops#current"
      onClick={handleClick}
      aria-label="Ir al itinerario"
      className="flex flex-col gap-0 min-w-0 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick/40"
    >
      {children}
    </Link>
  );
}
