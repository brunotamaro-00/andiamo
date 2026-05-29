import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentStopSlug } from "@/lib/current-stop";
import { logout } from "@/app/actions/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Itinerario — Europa 2026" };

export default async function StopsPage() {
  const [stops, currentSlug] = await Promise.all([
    db.stop.findMany({ orderBy: { order: "asc" } }),
    getCurrentStopSlug(),
  ]);

  const tripStart = new Date("2026-08-05");
  const today = new Date();
  const daysUntilTrip = Math.ceil((tripStart.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const tripStarted = today >= tripStart;

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-slate-950/90 backdrop-blur border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-100">Europa 2026</h1>
          {!tripStarted && daysUntilTrip > 0 && (
            <p className="text-xs text-sky-400">Faltan {daysUntilTrip} días ✈️</p>
          )}
          {tripStarted && (
            <p className="text-xs text-sky-400">¡El viaje ya empezó! 🎉</p>
          )}
        </div>
        <form action={logout}>
          <button type="submit" className="text-xs text-slate-500 hover:text-slate-300 transition-colors px-2 py-1">
            Salir
          </button>
        </form>
      </header>

      <main className="px-4 py-6 max-w-lg mx-auto">
        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Stat label="Paradas" value={stops.filter((s) => !s.isFlexMargin && !s.isCandidate).length.toString()} />
          <Stat label="Noches" value={stops.reduce((a, s) => a + s.nights, 0).toString()} />
          <Stat label="Países" value={[...new Set(stops.map((s) => s.country))].length.toString()} />
        </div>

        {/* Timeline */}
        <div className="space-y-2">
          {stops.map((stop, idx) => {
            const isActive = stop.slug === currentSlug;
            const isPast = stop.departureDate && today > new Date(stop.departureDate);
            const isFuture = stop.arrivalDate && today < new Date(stop.arrivalDate);
            const isCandidate = stop.isCandidate;

            if (stop.isFlexMargin) return null;

            return (
              <Link
                key={stop.id}
                href={`/stops/${stop.slug}`}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl border transition-all
                  ${isActive
                    ? "bg-sky-900/40 border-sky-500/50 shadow-lg shadow-sky-900/20"
                    : isCandidate
                    ? "bg-slate-900/50 border-dashed border-slate-700/50 opacity-60"
                    : isPast
                    ? "bg-slate-900/30 border-slate-800/50 opacity-50"
                    : "bg-slate-900 border-slate-800 hover:border-slate-600 active:bg-slate-800"
                  }
                `}
              >
                {/* Order / dot */}
                <div className={`
                  w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                  ${isActive ? "bg-sky-500 text-white" : isPast ? "bg-slate-700 text-slate-400" : "bg-slate-800 text-slate-400"}
                `}>
                  {isActive ? "→" : idx + 1}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-base">{stop.countryFlag}</span>
                    <span className={`font-semibold text-sm ${isActive ? "text-sky-100" : "text-slate-200"}`}>
                      {stop.name}
                    </span>
                    {!stop.datesFixed && (
                      <span className="text-[10px] bg-amber-900/50 text-amber-400 rounded px-1 py-0.5">tentativa</span>
                    )}
                    {stop.isTransit && (
                      <span className="text-[10px] bg-slate-800 text-slate-500 rounded px-1 py-0.5">tránsito</span>
                    )}
                    {isCandidate && (
                      <span className="text-[10px] bg-purple-900/50 text-purple-400 rounded px-1 py-0.5">candidata</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-slate-500">{stop.country}</span>
                    {stop.nights > 0 && (
                      <span className="text-xs text-slate-600">·</span>
                    )}
                    {stop.nights > 0 && (
                      <span className="text-xs text-slate-500">{stop.nights} noches</span>
                    )}
                    {stop.arrivalDate && (
                      <>
                        <span className="text-xs text-slate-600">·</span>
                        <span className="text-xs text-slate-500">
                          {formatShortDate(new Date(stop.arrivalDate))}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <span className="text-slate-600 text-sm">›</span>
              </Link>
            );
          })}
        </div>

        {/* Flex margin note */}
        <p className="text-center text-xs text-slate-600 mt-6">
          + 3 noches de margen flex (sin asignar)
        </p>

        {/* Global docs link */}
        <Link
          href="/general"
          className="mt-4 flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-800 bg-slate-900 hover:border-slate-600 transition-colors text-sm text-slate-400"
        >
          📄 Documentos y notas generales del viaje
        </Link>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-900 rounded-xl px-3 py-2.5 text-center border border-slate-800">
      <p className="text-lg font-bold text-slate-100">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}

function formatShortDate(d: Date): string {
  return d.toLocaleDateString("es-AR", { day: "numeric", month: "short", timeZone: "UTC" });
}
