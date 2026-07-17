import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { computeCurrentStopSlug } from "@/lib/current-stop";
import { todayStr, dateToStr, daysBetween, tripDayNumber } from "@/lib/trip";
import { requireAuth } from "@/lib/auth";
import { Suspense } from "react";
import { CurrencySection, CurrencyCardSkeleton } from "@/components/CurrencySection";
import { PoiPanel } from "@/components/PoiPanel";
import { NotesPanel } from "@/components/NotesPanel";
import { DocumentsPanel } from "@/components/DocumentsPanel";
import { EditStopPanel } from "@/components/EditStopPanel";
import { Badge } from "@/components/ui/Badge";
import type { Metadata } from "next";
import { ArrowLeft, ArrowRight, BookOpen, ChevronRight, MapPin, Thermometer, Sunrise, Sunset } from "lucide-react";
import { guidesForStop } from "@/lib/guides";
import { HashScroller } from "@/components/HashScroller";
import { PageHeader } from "@/components/PageHeader";
import { PersonSwitcher } from "@/components/PersonSwitcher";
import { getPerson } from "@/lib/person-server";
import { tentativeSunTimes } from "@/lib/sun";
import { assumedDateWindow } from "@/lib/itinerary";
import { Flag } from "@/components/Flag";
import StopSpendPanel, { SpendPanelSkeleton } from "@/components/StopSpendPanel";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const stop = await db.stop.findUnique({
    where: { slug },
    select: { name: true, countryFlag: true },
  });
  return {
    title: stop ? `${stop.name} · Andiamo` : "Andiamo",
  };
}

export default async function StopPage({ params }: Props) {
  await requireAuth();
  const { slug } = await params;

  // All three queries are independent and run concurrently. The stop list is
  // fetched once and shared by the current-stop, trip-day, and nav derivations.
  const [stop, allStopsRaw, currentOverride] = await Promise.all([
    db.stop.findUnique({
      where: { slug },
      include: {
        pois: {
          orderBy: [{ done: "asc" }, { createdAt: "asc" }],
        },
        notes: { orderBy: [{ pinned: "desc" }, { createdAt: "desc" }] },
        documents: { orderBy: { createdAt: "asc" } },
      },
    }),
    db.stop.findMany({
      orderBy: { order: "asc" },
      select: {
        id: true,
        slug: true,
        name: true,
        order: true,
        nights: true,
        countryFlag: true,
        isCandidate: true,
        isFlexMargin: true,
        arrivalDate: true,
        departureDate: true,
      },
    }),
    db.setting.findUnique({ where: { key: "manualCurrentStopId" } }),
  ]);

  if (!stop) notFound();

  const currentSlug = computeCurrentStopSlug(allStopsRaw, currentOverride?.value ?? null);

  const allOtherStops = allStopsRaw.filter((s) => !s.isFlexMargin);
  const firstDatedArrival = allOtherStops.find((s) => s.arrivalDate)?.arrivalDate ?? null;
  const tripDay = tripDayNumber(
    allOtherStops.find((s) => s.slug === slug)?.arrivalDate,
    firstDatedArrival,
  );

  const otherStops = allOtherStops.filter((s) => s.id !== stop.id);

  const prevStop = otherStops.filter((s) => s.order < stop.order).at(-1);
  const nextStop = otherStops.find((s) => s.order > stop.order);
  const allStops = otherStops;

  const isActive = slug === currentSlug;

  // UTC-safe trip phase + countdown calculations.
  // All dates from Prisma @db.Date are UTC midnight strings — compare as YYYY-MM-DD.
  const today = todayStr();
  const allConfirmedForPhase = [
    { isCandidate: stop.isCandidate, arrivalDate: stop.arrivalDate, departureDate: stop.departureDate },
    ...allOtherStops,
  ].filter((s) => !s.isCandidate);

  const firstArrivalStr =
    allConfirmedForPhase
      .filter((s) => s.arrivalDate)
      .map((s) => dateToStr(s.arrivalDate!))
      .sort()[0] ?? null;
  const lastDepartureStr =
    allConfirmedForPhase
      .filter((s) => s.departureDate)
      .map((s) => dateToStr(s.departureDate!))
      .sort()
      .at(-1) ?? null;

  const tripPhase: "before" | "during" | "after" =
    firstArrivalStr && today < firstArrivalStr
      ? "before"
      : lastDepartureStr && today >= lastDepartureStr
      ? "after"
      : "during";

  // Days remaining at this stop
  const depStr = stop.departureDate ? dateToStr(stop.departureDate) : null;
  const daysLeft = depStr ? Math.max(0, daysBetween(today, depStr)) : null;

  // Stay window — own dates, or the assumed gap between dated neighbors
  const stayWindow = assumedDateWindow(stop, allStopsRaw);

  // Tentative sunrise/sunset for the stay — pure local computation, no API
  const sunTimes = stayWindow
    ? tentativeSunTimes(
        stop.latitude,
        stop.longitude,
        stayWindow.arrival,
        stayWindow.departure,
        stop.timezone,
      )
    : null;

  const path = `/stops/${slug}`;

  return (
    <div className="min-h-screen bg-canvas">
      <PageHeader subtitle={stop.name} actions={<PersonSwitcher person={await getPerson()} />} />

      <main className="px-4 py-5 max-w-lg mx-auto space-y-4 pb-24">
        <HashScroller />

        {/* City header card */}
        <div
          className={`rounded-xl p-4 border-2 card-shadow ${
            isActive
              ? "bg-surface border-border border-t-[3px] border-t-brick"
              : "bg-surface border-border"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-3">
                <Flag flag={stop.countryFlag} className="text-4xl" />
                <div>
                  <h1 className="text-3xl font-display uppercase text-ink leading-tight tracking-wide">
                    {stop.name}
                  </h1>
                  <p className="text-sm text-ink-2 mt-0.5">{stop.country}</p>
                </div>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${stop.latitude},${stop.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Abrir ${stop.name} en Google Maps`}
                  className="self-start h-11 w-11 flex items-center justify-center rounded-full text-brick hover:bg-brick-bg transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick/40"
                >
                  <MapPin size={18} strokeWidth={1.5} aria-hidden="true" />
                </a>
              </div>

              <div className="flex flex-wrap gap-2 mt-3">
                {stop.arrivalDate ? (
                  <DateBadge>
                    {formatDate(stop.arrivalDate)} –{" "}
                    {stop.departureDate
                      ? formatDate(stop.departureDate)
                      : stayWindow
                      ? `≈${formatDate(stayWindow.departure)}`
                      : "?"}
                  </DateBadge>
                ) : (
                  stayWindow && (
                    <DateBadge>
                      ≈{formatDate(stayWindow.arrival)} – {formatDate(stayWindow.departure)}
                    </DateBadge>
                  )
                )}
                {stop.tempRange && (
                  <DateBadge>
                    <Thermometer size={11} strokeWidth={1.5} aria-hidden="true" className="inline mr-1" />
                    ≈{stop.tempRange}
                  </DateBadge>
                )}
              </div>
            </div>

            <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
              {isActive && tripPhase === "during" && <Badge variant="active">Aquí ahora</Badge>}
              {isActive && tripPhase === "before" && <Badge variant="special">Próxima parada</Badge>}
              {stop.isCandidate && <Badge variant="special">tentativa</Badge>}
              <EditStopPanel
                stopId={stop.id}
                slug={stop.slug}
                name={stop.name}
                arrivalDate={stop.arrivalDate}
                departureDate={stop.departureDate}
                nights={stop.nights}
                isCandidate={stop.isCandidate}
                currentOrder={stop.order}
                allStops={allStops}
              />
            </div>
          </div>

          {((stop.arrivalDate && tripDay !== null) || sunTimes) && (
            <div className="mt-3 pt-3 border-t border-border/50 flex flex-wrap items-center gap-3 text-xs text-ink-3">
              {stop.arrivalDate && tripDay !== null && (
                <>
                  <span>Día {tripDay} del viaje</span>
                  {isActive && tripPhase === "during" && daysLeft !== null && (
                    <span className="text-brick">
                      {daysLeft} {daysLeft === 1 ? "día" : "días"} restantes aquí
                    </span>
                  )}
                </>
              )}
              {sunTimes && (
                <span className="ml-auto flex items-center gap-1.5 tabular-nums">
                  <Sunrise size={13} strokeWidth={1.5} aria-hidden="true" className="text-warning" />
                  {sunTimes.sunrise}
                  <Sunset size={13} strokeWidth={1.5} aria-hidden="true" className="ml-1.5" />
                  {sunTimes.sunset}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Prev / Next navigation */}
        <div className="flex gap-2">
          {prevStop ? (
            <Link
              href={`/stops/${prevStop.slug}`}
              className={[
                "flex-1 flex items-center gap-1.5 bg-surface border border-border",
                "rounded-lg px-3 py-2.5 text-sm text-ink-2 hover:border-border-strong hover:text-ink transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick",
                "focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <ArrowLeft size={14} strokeWidth={1.5} aria-hidden="true" />
              <Flag flag={prevStop.countryFlag} />{" "}
              {prevStop.name}
            </Link>
          ) : (
            <div className="flex-1" />
          )}
          {nextStop ? (
            <Link
              href={`/stops/${nextStop.slug}`}
              className={[
                "flex-1 flex items-center justify-end gap-1.5 bg-surface border border-border",
                "rounded-lg px-3 py-2.5 text-sm text-ink-2 hover:border-border-strong hover:text-ink transition-colors text-right",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick",
                "focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <Flag flag={nextStop.countryFlag} />{" "}
              {nextStop.name}
              <ArrowRight size={14} strokeWidth={1.5} aria-hidden="true" />
            </Link>
          ) : (
            <div className="flex-1" />
          )}
        </div>

        {/* City guide */}
        <GuideCard stopSlug={stop.slug} />

        {/* Documents */}
        <div id="docs" className="scroll-mt-20">
          <DocumentsPanel
            stopId={stop.id}
            slug={stop.slug}
            documents={
              stop.documents as Parameters<typeof DocumentsPanel>[0]["documents"]
            }
            path={path}
          />
        </div>

        {/* Notes */}
        <div id="notas" className="scroll-mt-20">
          <NotesPanel
            stopId={stop.id}
            slug={stop.slug}
            notes={stop.notes.map((n) => ({ ...n, createdAt: n.createdAt }))}
            path={path}
          />
        </div>

        {/* POIs */}
        <div id="pois" className="scroll-mt-20">
          <PoiPanel
            stopId={stop.id}
            slug={stop.slug}
            stopLat={stop.latitude}
            stopLng={stop.longitude}
            pois={stop.pois as Parameters<typeof PoiPanel>[0]["pois"]}
          />
        </div>

        {/* Currency — streamed; converter stays interactive client-side */}
        <div id="moneda" className="scroll-mt-20">
          <Suspense fallback={<CurrencyCardSkeleton />}>
            <CurrencySection currencyCode={stop.currencyCode} />
          </Suspense>
        </div>

        {/* Spend panel — fed by Spitwise; degrades silently if unreachable */}
        <div id="gastos" className="scroll-mt-20">
          <Suspense fallback={<SpendPanelSkeleton />}>
            <StopSpendPanel slug={stop.slug} arrivalDate={stop.arrivalDate} />
          </Suspense>
        </div>
      </main>
    </div>
  );
}

/** Small inline badge for dates/temp ranges */
/** Card linking a stop to its guide hub, with quick chips per document.
 *  Extra guides (e.g. Costa Amalfitana from Nápoles) render as small links. */
function GuideCard({ stopSlug }: { stopSlug: string }) {
  const [primary, ...extras] = guidesForStop(stopSlug);
  if (!primary) return null;

  return (
    <div className="bg-surface rounded-xl border border-border card-shadow p-4 animate-fade-in">
      <Link
        href={`/guias/${primary.slug}`}
        className="flex items-center gap-3 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick/40 rounded-lg"
      >
        <BookOpen size={18} strokeWidth={1.5} className="text-brick shrink-0" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-ink-3">Guía</p>
          <p className="font-display uppercase text-[17px] leading-tight text-ink truncate group-hover:text-brick-ink transition-colors duration-150">
            {primary.title}
          </p>
        </div>
        <ChevronRight size={15} strokeWidth={2} className="text-border-strong shrink-0" aria-hidden="true" />
      </Link>

      {primary.docs.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {primary.docs.map((doc) => (
            <Link
              key={doc.slug}
              href={`/guias/${primary.slug}/${doc.slug}`}
              className="rounded-full border border-border px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-[0.08em] text-ink-2 transition-colors duration-150 hover:border-border-strong hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick/40"
            >
              {doc.title}
            </Link>
          ))}
        </div>
      )}

      {extras.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border space-y-1">
          {extras.map((guide) => (
            <Link
              key={guide.slug}
              href={`/guias/${guide.slug}`}
              className="flex items-center gap-1.5 text-xs font-semibold text-ink-2 hover:text-ink transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick/40 rounded"
            >
              <ChevronRight size={12} strokeWidth={2} aria-hidden="true" />
              También cerca: {guide.title}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function DateBadge({ children }: { children: React.ReactNode }) {
  return (
    <Badge variant="default" className="gap-0.5 px-2.5 py-1">
      {children}
    </Badge>
  );
}

function formatDate(d: Date | string): string {
  return new Date(d).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

