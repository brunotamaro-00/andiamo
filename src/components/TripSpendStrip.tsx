import { ExternalLink, Wallet } from "lucide-react";

import { spitwisePublicUrl, fetchTripSpend } from "@/lib/spitwise";
import { personLabel } from "@/lib/person";
import { getPerson } from "@/lib/person-server";

/** Trip-total spend strip for /hoy, fed by Spitwise. Links to the
 *  Spitwise dashboard. Renders nothing when Spitwise is unreachable or there
 *  are no expenses yet. Scoped to the current viewer (see lib/person.ts). */
export default async function TripSpendStrip() {
  const person = await getPerson();
  const spend = await fetchTripSpend(person);
  const spitwiseUrl = spitwisePublicUrl();
  if (!spend || !spitwiseUrl || spend.movement_count === 0) return null;

  return (
    <a
      href={spitwiseUrl}
      target="_blank"
      rel="noopener"
      className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas rounded-[4px] animate-fade-in stagger-1"
    >
      <div className="flex items-center gap-3 bg-surface border-2 border-border rounded-[4px] px-4 py-3 card-shadow transition-all duration-150 hover:border-border-strong hover:-translate-y-[2px] motion-reduce:hover:translate-y-0">
        <Wallet size={16} strokeWidth={1.5} aria-hidden="true" className="text-gold shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-ink-3">
            {person ? `Gastos · ${personLabel(person)}` : "Gastos del viaje"}
          </p>
          <p className="text-sm font-semibold text-ink mt-0.5 font-tabular">
            USD {spend.total_usd}
            {spend.today_usd !== "0.00" && (
              <span className="text-ink-2 font-normal"> · hoy USD {spend.today_usd}</span>
            )}
          </p>
        </div>
        <ExternalLink size={14} strokeWidth={2} aria-hidden="true" className="text-border-strong shrink-0" />
      </div>
    </a>
  );
}
