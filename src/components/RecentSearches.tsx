"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { History } from "lucide-react";
import { getRecentSearches } from "@/lib/recent-searches";

/** Chips with the last searches, shown on /search's empty state. Reads
 *  localStorage after mount (SSR renders nothing) — en viaje se repiten
 *  siempre las mismas búsquedas. */
export function RecentSearches() {
  const [recents, setRecents] = useState<string[]>([]);

  useEffect(() => {
    // Deferred a frame: SSR and hydration both render the empty state first.
    const id = requestAnimationFrame(() => setRecents(getRecentSearches()));
    return () => cancelAnimationFrame(id);
  }, []);

  if (recents.length === 0) return null;

  return (
    <div className="animate-fade-in">
      <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.08em] text-ink-3 mb-2">
        <History size={13} strokeWidth={1.5} aria-hidden="true" />
        Recientes
      </p>
      <div className="flex flex-wrap gap-1.5">
        {recents.map((q) => (
          <Link
            key={q}
            href={`/search?q=${encodeURIComponent(q)}`}
            className="inline-flex items-center min-h-[36px] px-3.5 rounded-full border border-border bg-surface text-sm text-ink-2 hover:border-border-strong hover:text-ink transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick/40"
          >
            {q}
          </Link>
        ))}
      </div>
    </div>
  );
}
