import { Card, SectionHeader } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { CurrencyCard } from "@/components/CurrencyCard";
import { fetchRates } from "@/lib/rates";

/** Server component — fetches rates during render (cached 12 h), streamed via Suspense. */
export async function CurrencySection({ currencyCode }: { currencyCode: string }) {
  const result = await fetchRates();

  if (!result) {
    return (
      <Card>
        <SectionHeader title="Moneda" />
        <p className="text-ink-3 text-sm">No se pudieron cargar las cotizaciones.</p>
      </Card>
    );
  }

  return (
    <CurrencyCard
      currencyCode={currencyCode}
      rate={result.rates[currencyCode] ?? null}
      date={result.date}
      source={result.source}
    />
  );
}

/** Suspense fallback that mirrors the final card layout — no layout shift. */
export function CurrencyCardSkeleton() {
  return (
    <Card>
      <SectionHeader title="Moneda" />
      <div className="flex items-center gap-3 mb-4">
        <Skeleton className="h-[52px] flex-1 rounded-lg" />
        <div className="space-y-1.5 flex flex-col items-end">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <Skeleton className="h-[120px] rounded-lg" />
    </Card>
  );
}
