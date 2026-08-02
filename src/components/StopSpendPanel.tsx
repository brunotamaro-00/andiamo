import { ExternalLink, Wallet } from "lucide-react";

import { ProgressBar } from "@/components/ui/ProgressBar";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { categoryIcon } from "@/lib/categoryIcons";
import { spitwisePublicUrl, fetchStopSpendDetail } from "@/lib/spitwise";
import { personLabel } from "@/lib/person";
import { getPerson } from "@/lib/person-server";
import { todayStr, dateToStr } from "@/lib/trip";

/** Spitwise sends amounts as strings; they render rounded to whole USD. */
const usd = (v: string | number) => Math.round(Number(v) || 0);

/** Rich spend panel fed by Spitwise: total and per-category bars. Per-movement
 *  detail lives in Spitwise itself. Degrades silently — Spitwise down or future
 *  stop with no data renders nothing; current/past stop with no data shows a
 *  slim hint. Scoped to the current viewer (see lib/person.ts). */
export default async function StopSpendPanel({
  slug,
  arrivalDate,
}: {
  slug: string;
  arrivalDate: Date | null;
}) {
  const person = await getPerson();
  const detail = await fetchStopSpendDetail(slug, person);
  const spitwiseUrl = spitwisePublicUrl();
  const cityUrl = spitwiseUrl ? `${spitwiseUrl}/ciudades?c=${encodeURIComponent(slug)}` : null;
  const isFuture = arrivalDate !== null && todayStr() < dateToStr(arrivalDate);

  const empty = !detail || detail.movement_count === 0;
  if (empty) {
    // Future stops with no expenses: no dead UI. Current/past: friendly hint.
    if (isFuture || !cityUrl) return null;
    return (
      <div className="bg-surface rounded-xl border border-border card-shadow p-4 animate-fade-in">
        <div className="flex items-center gap-3">
          <Wallet size={18} strokeWidth={1.5} className="text-gold shrink-0" aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <p className="label-caps text-ink-3">
              {person ? `Gastos · ${personLabel(person)}` : "Gastos"}
            </p>
            <p className="text-sm text-ink-2">Sin gastos todavía</p>
          </div>
          <SpitwiseLink href={cityUrl} />
        </div>
      </div>
    );
  }

  const total = Number(detail.total_usd);
  return (
    <div className="bg-surface rounded-xl border border-border card-shadow p-4 animate-fade-in space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Wallet size={18} strokeWidth={1.5} className="text-gold shrink-0 mt-1" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <p className="label-caps text-ink-3">
            {person ? `Gastos · ${personLabel(person)}` : "Gastos"}
          </p>
          <p className="font-display uppercase text-title-xl leading-tight text-ink font-tabular">
            USD <AnimatedNumber value={total} decimals={0} />
          </p>
          {detail.itinerary_days > 0 && (
            <p className="text-meta text-ink-2 font-tabular">
              ≈ USD {usd(detail.avg_per_day_usd)}/día · {detail.itinerary_days}{" "}
              {detail.itinerary_days === 1 ? "día" : "días"}
            </p>
          )}
        </div>
        {cityUrl && <SpitwiseLink href={cityUrl} />}
      </div>

      {/* Category bars */}
      {detail.by_category.length > 0 && (
        <ul className="space-y-2">
          {detail.by_category.map((cat, i) => {
            const value = Number(cat.total_usd);
            const pct = total > 0 ? Math.max((value / total) * 100, 2) : 0;
            const Icon = categoryIcon(cat.name);
            return (
              <li key={cat.category_id ?? "otros"}>
                <div className="flex items-baseline justify-between gap-2 mb-0.5">
                  <span className="inline-flex items-center gap-1.5 label-caps text-ink-2 truncate min-w-0">
                    <Icon size={12} strokeWidth={2} className="shrink-0 text-gold" aria-hidden="true" />
                    {cat.name ?? "Otros"}
                  </span>
                  <span className="font-tabular text-meta font-bold text-ink shrink-0">
                    USD {usd(cat.total_usd)}
                  </span>
                </div>
                <ProgressBar value={pct} animateIn delayMs={Math.min(i, 5) * 40} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function SpitwiseLink({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink px-3 py-1.5 label-caps text-ink shrink-0 min-h-[44px] sm:min-h-0 transition-colors duration-150 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick/40"
    >
      Spitwise
      <ExternalLink size={11} strokeWidth={2} aria-hidden="true" />
    </a>
  );
}

export function SpendPanelSkeleton() {
  return (
    <div className="bg-surface rounded-xl border border-border card-shadow p-4 space-y-3 animate-pulse-skeleton">
      <div className="h-3 w-16 bg-surface-2 rounded-md" />
      <div className="h-6 w-32 bg-surface-2 rounded-md" />
      <div className="h-1.5 w-full bg-surface-2 rounded-full" />
      <div className="h-1.5 w-3/4 bg-surface-2 rounded-full" />
    </div>
  );
}
