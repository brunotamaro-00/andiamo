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
      className="shrink-0 bg-gold border-b-2 border-gold-ink/25 px-4 pb-2 pt-[calc(0.5rem+env(safe-area-inset-top))] flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-gold-ink"
    >
      <FlaskConical size={13} strokeWidth={2.5} aria-hidden="true" className="shrink-0" />
      <span className="text-meta font-extrabold uppercase tracking-[0.08em]">Demo pública</span>
      <span className="text-meta font-semibold">datos inventados, no es un viaje real</span>
      {spitwise ? (
        <a
          href={spitwise}
          className="text-meta font-extrabold uppercase tracking-[0.08em] underline underline-offset-2 decoration-2"
        >
          Ver Spitwise ↗
        </a>
      ) : null}
    </div>
  );
}
