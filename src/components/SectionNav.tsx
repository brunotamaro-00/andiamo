"use client";

import { useEffect, useState } from "react";
import { haptics } from "@/lib/haptics";

export interface SectionNavItem {
  id: string;
  label: string;
}

/** Sticky chip row under the PageHeader for long detail pages. Scrollspy via
 *  IntersectionObserver — the observer root is #scroll-root (the app's scroll
 *  container), not the window. Anchors need `scroll-mt-*` for the offset. */
export function SectionNav({ items }: { items: SectionNavItem[] }) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const root = document.getElementById("scroll-root");
    const sections = items
      .map(({ id }) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;

    // Track which sections intersect a band near the top of the viewport and
    // mark the first one (document order) as active.
    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        const first = sections.find((s) => visible.has(s.id));
        setActive(first ? first.id : null);
      },
      { root, rootMargin: "-96px 0px -55% 0px" },
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [items]);

  function handleClick(id: string) {
    haptics.tap();
    document.getElementById(id)?.scrollIntoView({ block: "start" });
  }

  return (
    <nav
      aria-label="Secciones de la parada"
      // Below the sticky PageHeader; z under it so the header shadow wins
      className="sticky top-[calc(2.75rem+env(safe-area-inset-top))] z-[9] -mx-4 px-4 py-2 bg-canvas/95 backdrop-blur-sm"
    >
      <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
        {items.map(({ id, label }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              onClick={() => handleClick(id)}
              aria-current={isActive ? "true" : undefined}
              className={[
                "shrink-0 min-h-[36px] px-3.5 rounded-full border text-[11px] font-extrabold uppercase tracking-[0.08em]",
                "transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick/40",
                isActive
                  ? "bg-ink text-canvas border-ink"
                  : "bg-surface text-ink-2 border-border hover:border-border-strong hover:text-ink",
              ].join(" ")}
            >
              {label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
