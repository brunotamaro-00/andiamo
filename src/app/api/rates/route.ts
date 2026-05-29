import { db } from "@/lib/db";

export const runtime = "nodejs";

const CURRENCIES = ["GBP", "EUR", "CHF", "CZK", "PLN", "HUF"];

export async function GET() {
  try {
    const res = await fetch(
      `https://api.frankfurter.app/latest?from=USD&to=${CURRENCIES.join(",")}`,
      { next: { revalidate: 43200 } } // 12h cache
    );

    if (!res.ok) throw new Error("Frankfurter error");

    const data = await res.json();
    const rates: Record<string, number> = data.rates ?? {};

    // Persist to DB as fallback for offline
    await db.setting.upsert({
      where: { key: "cachedRates" },
      update: { value: JSON.stringify(rates) },
      create: { key: "cachedRates", value: JSON.stringify(rates) },
    });

    return Response.json({ rates, source: "live", base: "USD", date: data.date });
  } catch {
    // Fallback to cached rates from DB
    const cached = await db.setting.findUnique({ where: { key: "cachedRates" } });
    if (cached) {
      return Response.json({
        rates: JSON.parse(cached.value),
        source: "cached",
        base: "USD",
      });
    }
    return Response.json({ error: "Rates unavailable" }, { status: 503 });
  }
}
