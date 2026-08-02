import Link from "next/link";
import { Lockup } from "@/components/Brand";
import { BRAND_TAGLINE } from "@/lib/brand";

export default function NotFound() {
  return (
    <div className="min-h-full bg-canvas flex flex-col items-center justify-center px-6 text-center gap-6">
      <Lockup size="lg" tagline={BRAND_TAGLINE} />

      <div className="space-y-1">
        <p className="font-numeral text-7xl leading-none text-border font-black select-none">
          404
        </p>
        <p className="text-lg font-display uppercase tracking-wide text-ink">
          Parada no encontrada
        </p>
        <p className="text-sm text-ink-2 max-w-xs">
          Esta ciudad no está en el itinerario o el link es incorrecto.
        </p>
      </div>

      <Link
        href="/stops"
        className="px-5 py-2.5 bg-brick text-surface text-sm font-display uppercase tracking-wide rounded-md hard-shadow-ink hover:bg-brick-hover active:bg-brick-press active:translate-x-[2px] active:translate-y-[2px] active:shadow-none motion-reduce:active:translate-x-0 motion-reduce:active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick/50 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas transition-all duration-150"
      >
        Ver itinerario
      </Link>
    </div>
  );
}
