import { db } from "./db";

/** USD exchange rates — live from Frankfurter (cached 12 h), with a DB fallback for offline. */

export interface RatesResult {
  rates: Record<string, number>;
  source: "live" | "cached";
  date?: string;
}

export async function fetchRates(): Promise<RatesResult | null> {
  try {
    const res = await fetch("https://api.frankfurter.app/latest?from=USD", {
      next: { revalidate: 43200 }, // 12h cache
    });
    if (!res.ok) throw new Error("Frankfurter error");

    const data = await res.json();
    const rates: Record<string, number> = data.rates ?? {};

    // Persist to DB as fallback for when the API is unreachable
    await db.setting.upsert({
      where: { key: "cachedRates" },
      update: { value: JSON.stringify(rates) },
      create: { key: "cachedRates", value: JSON.stringify(rates) },
    });

    return { rates, source: "live", date: data.date };
  } catch {
    const cached = await db.setting.findUnique({ where: { key: "cachedRates" } });
    if (cached) {
      try {
        return { rates: JSON.parse(cached.value), source: "cached" };
      } catch {
        // Corrupt cached value — fall through
      }
    }
    return null;
  }
}
