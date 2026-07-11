import { Wallet } from "lucide-react";

import { fetchStopSpend } from "@/lib/botardo";

/** Chip "Gastado: USD X" fed by Botardo. Renders nothing when Botardo is
 *  unreachable or the stop has no expenses yet. */
export default async function StopSpendChip({ slug }: { slug: string }) {
  const spend = await fetchStopSpend(slug);
  if (!spend || spend.total_usd === "0.00") return null;
  return (
    <div className="inline-flex items-center gap-2 rounded-[4px] border-2 border-border bg-surface px-3 py-1.5 card-shadow animate-fade-in">
      <Wallet size={16} strokeWidth={1.5} className="text-gold shrink-0" aria-hidden="true" />
      <span className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-ink-3">
        Gastado
      </span>
      <span className="font-tabular text-sm font-bold text-ink">
        USD {spend.total_usd}
      </span>
    </div>
  );
}
