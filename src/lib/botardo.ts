/** Botardo (expense tracker) integration. Same rule as rates.ts:
 *  never let a third-party failure 500 a page — degrade to null. */
export async function fetchStopSpend(
  slug: string,
): Promise<{ total_usd: string } | null> {
  const base = process.env.BOTARDO_URL;
  const key = process.env.TRIP_SHARED_API_KEY;
  if (!base || !key) return null;
  try {
    const res = await fetch(
      `${base}/api/v1/cities/spend?slug=${encodeURIComponent(slug)}`,
      {
        headers: { "X-Api-Key": key },
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
