"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Loader2 } from "lucide-react";
import { addRecentSearch } from "@/lib/recent-searches";

export function SearchBox({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);
  const [isPending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // A pending debounce would otherwise fire after the user navigated away and
  // router.replace() would yank them back to /search.
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function update(next: string) {
    setValue(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const trimmed = next.trim();
      if (trimmed.length >= 2) addRecentSearch(trimmed);
      startTransition(() => {
        router.replace(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : "/search");
      });
    }, 300);
  }

  return (
    <div className="relative flex-1">
      {isPending ? (
        <Loader2
          size={16}
          strokeWidth={1.5}
          aria-hidden="true"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-brick animate-spin pointer-events-none"
        />
      ) : (
        <Search
          size={16}
          strokeWidth={1.5}
          aria-hidden="true"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none"
        />
      )}
      <input
        type="search"
        value={value}
        onChange={(e) => update(e.target.value)}
        placeholder="Buscar ciudades, lugares, notas…"
        aria-label="Buscar en el viaje"
        autoFocus
        enterKeyHint="search"
        className="w-full bg-surface-2 border border-border-strong rounded-xl pl-9 pr-12 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-brick focus-visible:ring-offset-2 focus-visible:ring-offset-canvas transition-colors"
      />
      {value && (
        <button
          onClick={() => update("")}
          aria-label="Limpiar búsqueda"
          className="absolute right-0 top-1/2 -translate-y-1/2 h-11 w-11 flex items-center justify-center rounded-xl text-ink-3 hover:text-ink hover:bg-border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick"
        >
          <X size={14} strokeWidth={1.5} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
