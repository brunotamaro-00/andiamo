import { FlaskConical } from "lucide-react";
import { IS_DEMO } from "@/lib/demo";
import { spitwisePublicUrl } from "@/lib/spitwise";

/** Thin global banner for the public demo deploy. Server component: it only
 *  reads env, and staying RSC keeps it out of the client bundle.
 *
 *  Same placement contract as `OfflineBanner` — first flex child of <body>, in
 *  normal flow rather than fixed, so it pushes the sticky header down instead
 *  of covering the wordmark. Both can be visible at once (demo + offline). */
export function DemoBanner() {
  if (!IS_DEMO) return null;

  const spitwise = spitwisePublicUrl();

  return (
    <div
      role="status"
      className="shrink-0 bg-gold-bg border-b-2 border-gold/40 px-4 pb-1.5 pt-[calc(0.375rem+env(safe-area-inset-top))] flex items-center justify-center gap-2"
    >
      <FlaskConical size={12} strokeWidth={2} aria-hidden="true" className="text-gold-ink shrink-0" />
      <span className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-gold-ink">
        Demo · datos ficticios
      </span>
      {spitwise ? (
        <a
          href={spitwise}
          className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-brick-ink underline underline-offset-2"
        >
          Ver Spitwise
        </a>
      ) : null}
    </div>
  );
}
