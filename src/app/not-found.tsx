import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center px-6 text-center gap-6">
      <Wordmark size="lg" />

      <div className="space-y-1">
        <p className="font-numeral text-[72px] leading-none text-border font-black select-none">
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
        className="px-5 py-2.5 bg-brick text-surface text-sm font-display uppercase tracking-wide rounded-[2px] hard-shadow-ink active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all duration-150"
      >
        Ver itinerario
      </Link>
    </div>
  );
}
