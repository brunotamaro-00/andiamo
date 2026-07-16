/** Spitwise (expense tracker) integration. Same rule as rates.ts:
 *  never let a third-party failure 500 a page — degrade to null.
 *  Env: SPITWISE_URL (falls back to the legacy BOTARDO_URL until the
 *  Railway variable is renamed) + TRIP_SHARED_API_KEY. */

export type SpendDetailCategory = {
  category_id: number | null;
  name: string | null;
  icon: string | null;
  total_usd: string;
};

export type SpendDetailMovement = {
  description: string | null;
  amount: string;
  currency: string;
  amount_usd: string;
  date: string;
  category_id: number | null;
  paid_by_name: string | null;
};

export type SpendDetail = {
  slug: string;
  city_name: string | null;
  total_usd: string;
  movement_count: number;
  itinerary_days: number;
  avg_per_day_usd: string;
  by_category: SpendDetailCategory[];
  last_movements: SpendDetailMovement[];
  generated_at: string;
};

export type TripSpend = {
  total_usd: string;
  today_usd: string;
  movement_count: number;
};

function baseUrl(): string {
  return process.env.SPITWISE_URL || process.env.BOTARDO_URL || "";
}

function env(): { base: string; key: string } | null {
  const base = baseUrl();
  const key = process.env.TRIP_SHARED_API_KEY;
  if (!base || !key) return null;
  return { base, key };
}

/** Public Spitwise URL for deep links ("" when unconfigured — callers hide the link). */
export function spitwisePublicUrl(): string {
  return baseUrl();
}

export async function fetchStopSpend(
  slug: string,
): Promise<{ total_usd: string } | null> {
  const cfg = env();
  if (!cfg) return null;
  try {
    const res = await fetch(
      `${cfg.base}/api/v1/cities/spend?slug=${encodeURIComponent(slug)}`,
      {
        headers: { "X-Api-Key": cfg.key },
        next: { revalidate: 300 },
      },
    );
    if (!res.ok) return null;
    const arr = (await res.json()) as Array<{ slug: string; total_usd: string }>;
    const hit = arr.find((c) => c.slug === slug);
    return hit ? { total_usd: hit.total_usd } : { total_usd: "0.00" };
  } catch {
    return null;
  }
}

export async function fetchStopSpendDetail(slug: string): Promise<SpendDetail | null> {
  const cfg = env();
  if (!cfg) return null;
  try {
    const res = await fetch(
      `${cfg.base}/api/v1/cities/spend-detail?slug=${encodeURIComponent(slug)}&limit=5`,
      {
        headers: { "X-Api-Key": cfg.key },
        next: { revalidate: 120 },
      },
    );
    if (!res.ok) return null;
    return (await res.json()) as SpendDetail;
  } catch {
    return null;
  }
}

export async function fetchTripSpend(): Promise<TripSpend | null> {
  const cfg = env();
  if (!cfg) return null;
  try {
    const res = await fetch(`${cfg.base}/api/v1/trip/spend`, {
      headers: { "X-Api-Key": cfg.key },
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return (await res.json()) as TripSpend;
  } catch {
    return null;
  }
}

/** Fire-and-forget "stops.changed" ping so Spitwise re-pulls the itinerary
 *  immediately instead of waiting for its 6h lazy sync. Never throws — the
 *  lazy pull is the fallback when Spitwise is unreachable. Run it via
 *  `after()` from server actions so stop edits never wait on it. */
export async function notifyStopsChanged(): Promise<void> {
  const cfg = env();
  if (!cfg) return;
  const body = JSON.stringify({
    event: "stops.changed",
    source: "andiamo",
    ts: new Date().toISOString(),
  });
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`${cfg.base}/api/v1/andiamo/sync-hook`, {
        method: "POST",
        headers: { "X-Api-Key": cfg.key, "Content-Type": "application/json" },
        body,
        signal: AbortSignal.timeout(3000),
        cache: "no-store",
      });
      if (res.ok) return;
    } catch {
      // swallow — retried once, then the 6h lazy pull covers it
    }
    if (attempt === 0) await new Promise((r) => setTimeout(r, 1500));
  }
}
