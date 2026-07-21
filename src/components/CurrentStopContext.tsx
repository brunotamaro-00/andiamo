"use client";

import { createContext, useContext, useEffect, useState } from "react";

/** Which stop slug is "today's" current stop. Published by dynamic pages that
 *  already resolve it (stop detail), read by the TabBar to light up "Hoy" while
 *  you're viewing the current stop. Kept in a client context so SSG pages
 *  (/guias) never have to read cookies to compute it. */
const CurrentStopContext = createContext<{
  slug: string | null;
  setSlug: (slug: string | null) => void;
}>({ slug: null, setSlug: () => {} });

export function CurrentStopProvider({ children }: { children: React.ReactNode }) {
  const [slug, setSlug] = useState<string | null>(null);
  return (
    <CurrentStopContext.Provider value={{ slug, setSlug }}>
      {children}
    </CurrentStopContext.Provider>
  );
}

export function useCurrentStopSlug(): string | null {
  return useContext(CurrentStopContext).slug;
}

/** Rendered by server pages that know the current stop slug — publishes it to
 *  the context. A null slug leaves the last known value untouched. */
export function CurrentStopSync({ slug }: { slug: string | null }) {
  const { setSlug } = useContext(CurrentStopContext);
  useEffect(() => {
    if (slug) setSlug(slug);
  }, [slug, setSlug]);
  return null;
}
