"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";

export function SearchBox({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function update(next: string) {
    setValue(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const trimmed = next.trim();
      router.replace(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : "/search");
    }, 300);
  }

  return (
    <div className="relative flex-1">
      <Search
        size={16}
        strokeWidth={1.5}
        aria-hidden="true"
        className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => update(e.target.value)}
        placeholder="Buscar ciudades, lugares, notas…"
        aria-label="Buscar en el viaje"
        autoFocus
        enterKeyHint="search"
        className="w-full bg-surface-2 border border-border-strong rounded-xl pl-9 pr-9 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2 focus-visible:ring-offset-canvas transition-colors"
      />
      {value && (
        <button
          onClick={() => update("")}
          aria-label="Limpiar búsqueda"
          className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 flex items-center justify-center rounded-lg text-ink-3 hover:text-ink hover:bg-border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral"
        >
          <X size={14} strokeWidth={1.5} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
