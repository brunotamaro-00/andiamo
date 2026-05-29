import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentStopSlug } from "@/lib/current-stop";
import { logout } from "@/app/actions/auth";
import { AddStopButton } from "@/components/AddStopButton";
import { Badge } from "@/components/ui/Badge";
import { ChevronRight, Plane, FileText } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Itinerario — Europa 2026" };

export default async function StopsPage() {
  const [stops, currentSlug] = await Promise.all([
    db.stop.findMany({ orderBy: { order: "asc" } }),
    getCurrentStopSlug(),
  ]);

  const tripStart = new Date("2026-08-05");
  const today = new Date();
  const daysUntilTrip = Math.ceil(
    (tripStart.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
  const tripStarted = today >= tripStart;

  return (
    <div className="min-h-screen bg-sand-950">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-sand-950/90 backdrop-blur border-b border-sand-800 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold font-display text-sand-100">
              Europa 2026
            </h1>
            {!tripStarted && daysUntilTrip > 0 && (
              <p className="text-xs text-gold-400 flex items-center gap-1 mt-0.5">
                <Plane size={11} strokeWidth={1.5} aria-hidden="true" />
                Faltan {daysUntilTrip} días
              </p>
            )}
            {tripStarted && (
              <p className="text-xs text-gold-400 mt-0.5">¡El viaje ya empezó!</p>
            )}
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="text-xs text-sand-500 hover:text-sand-300 transition-colors px-2 py-1 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 focus-visible:ring-offset-sand-950"
            >
              Salir
            </button>
          </form>
        </div>
      </header>

      <main className="px-4 py-6 max-w-lg mx-auto pb-24">
        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Stat
            label="Paradas"
            value={stops
              .filter((s) => !s.isFlexMargin && !s.isCandidate)
              .length.toString()}
          />
          <Stat
            label="Noches"
            value={stops.reduce((a, s) => a + s.nights, 0).toString()}
          />
          <Stat
            label="Países"
            value={[...new Set(stops.map((s) => s.country))].length.toString()}
          />
        </div>

        {/* Timeline */}
        <div className="space-y-2">
          {stops.map((stop, idx) => {
            const isActive = stop.slug === currentSlug;
            const isPast =
              stop.departureDate && today > new Date(stop.departureDate);
            const isCandidate = stop.isCandidate;

            if (stop.isFlexMargin) return null;

            return (
              <Link
                key={stop.id}
                href={`/stops/${stop.slug}`}
                className={[
                  "flex items-center gap-3 px-4 py-3 rounded-xl border transition-all",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400",
                  "focus-visible:ring-offset-2 focus-visible:ring-offset-sand-950",
                  isActive
                    ? "bg-gold-900 border-gold-700/60"
                    : isCandidate
                    ? "bg-sand-900/50 border-dashed border-sand-800/50 opacity-60"
                    : isPast
                    ? "bg-sand-900/30 border-sand-800/50 opacity-50"
                    : "bg-sand-900 border-sand-800 hover:border-sand-700 active:bg-sand-850",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {/* Order indicator */}
                <div
                  className={[
                    "w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0",
                    isActive
                      ? "bg-gold-800 border border-gold-600/60 text-gold-300"
                      : isPast
                      ? "bg-sand-850 text-sand-600"
                      : "bg-sand-850 text-sand-400",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {idx + 1}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-base" aria-hidden="true">
                      {stop.countryFlag}
                    </span>
                    <span
                      className={`font-medium text-sm ${
                        isActive ? "text-gold-200" : "text-sand-100"
                      }`}
                    >
                      {stop.name}
                    </span>
                    {!stop.datesFixed && (
                      <Badge variant="warning">tentativa</Badge>
                    )}
                    {stop.isTransit && <Badge variant="muted">tránsito</Badge>}
                    {isCandidate && (
                      <Badge variant="special">candidata</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className={`text-xs ${
                        isActive ? "text-gold-400/70" : "text-sand-500"
                      }`}
                    >
                      {stop.country}
                    </span>
                    {stop.nights > 0 && (
                      <>
                        <span className="text-xs text-sand-700">·</span>
                        <span
                          className={`text-xs ${
                            isActive ? "text-gold-400/70" : "text-sand-500"
                          }`}
                        >
                          {stop.nights} noches
                        </span>
                      </>
                    )}
                    {stop.arrivalDate && (
                      <>
                        <span className="text-xs text-sand-700">·</span>
                        <span
                          className={`text-xs ${
                            isActive ? "text-gold-400/70" : "text-sand-500"
                          }`}
                        >
                          {formatShortDate(new Date(stop.arrivalDate))}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <ChevronRight
                  size={16}
                  strokeWidth={1.5}
                  className={isActive ? "text-gold-500" : "text-sand-700"}
                  aria-hidden="true"
                />
              </Link>
            );
          })}
        </div>

        {/* Add stop */}
        <AddStopButton
          stops={stops
            .filter((s) => !s.isFlexMargin)
            .map((s) => ({
              id: s.id,
              order: s.order,
              name: s.name,
              countryFlag: s.countryFlag,
            }))}
        />

        {/* Global docs link */}
        <Link
          href="/general"
          className={[
            "mt-4 flex items-center justify-center gap-2 py-3 rounded-xl border border-sand-800",
            "bg-sand-900 hover:border-sand-700 transition-colors text-sm text-sand-400 hover:text-sand-200",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400",
            "focus-visible:ring-offset-2 focus-visible:ring-offset-sand-950",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <FileText size={14} strokeWidth={1.5} aria-hidden="true" />
          Documentos y notas generales del viaje
        </Link>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-sand-900 rounded-xl px-3 py-2.5 text-center border border-sand-800">
      <p className="text-xl font-semibold font-display text-sand-100">{value}</p>
      <p className="text-xs text-sand-500">{label}</p>
    </div>
  );
}

function formatShortDate(d: Date): string {
  return d.toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}
