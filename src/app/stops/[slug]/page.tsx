import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { computeCurrentStopSlug } from "@/lib/current-stop";
import { todayStr, dateToStr, daysBetween, tripDayNumber } from "@/lib/trip";
import { requireAuth } from "@/lib/auth";
import { Suspense } from "react";
import { NotesPanel } from "@/components/NotesPanel";
import { DocumentsPanel } from "@/components/DocumentsPanel";
import { EditStopPanel } from "@/components/EditStopPanel";
import { Badge } from "@/components/ui/Badge";
import type { Metadata } from "next";
import { ArrowLeft, ArrowRight, BookOpen, ChevronRight, Thermometer, Sunrise, Sunset } from "lucide-react";
import { docKind, guideCityForStop, guidesForStop } from "@/lib/guides";
import type { GuideDoc } from "@/lib/guides";
import { HashScroller } from "@/components/HashScroller";
import { CurrentStopSync } from "@/components/CurrentStopContext";
import { PageHeader } from "@/components/PageHeader";
import { PersonSwitcher } from "@/components/PersonSwitcher";
import { getPerson } from "@/lib/person-server";
import { stopVisibleTo } from "@/lib/person";
import { tentativeSunTimes } from "@/lib/sun";
import { assumedDateWindow } from "@/lib/itinerary";
import { itinerarySpine } from "@/lib/itinerary-slots";
import { Flag } from "@/components/Flag";
import { cardClass } from "@/components/ui/Card";
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
  const [stop, allStopsRaw, currentOverride, tripStartSetting, viewer] = await Promise.all([
    db.stop.findUnique({
      where: { slug },
      include: {
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
        isLocal: true,
        arrivalDate: true,
        departureDate: true,
        ownerPerson: true,
      },
    }),
    db.setting.findUnique({ where: { key: "manualCurrentStopId" } }),
    db.setting.findUnique({ where: { key: "tripStartDate" } }),
    getPerson(),
  ]);

  if (!stop) notFound();
  // Keeps the URL consistent with the list for the current view (Bruno →
  // /stops/pititas 404s, Katia → /stops/lisboa 404s). NOT a privacy boundary:
  // person is a view preference (see lib/person.ts), PersonSwitcher flips to
  // "Ambos" freely, both people share one session token, and the mutations
  // don't check stopVisibleTo at all. Don't rely on this to hide anything.
  if (!stopVisibleTo(stop, viewer)) notFound();

  const currentSlug = computeCurrentStopSlug(
    allStopsRaw,
    currentOverride?.value ?? null,
    todayStr(),
    viewer,
  );

  // Only stops the viewer can actually open — otherwise prev/next would link to
  // a neighbour they can't see (Pititas ↔ Porto across the swap) and 404.
  const allOtherStops = allStopsRaw.filter((s) => !s.isFlexMargin && stopVisibleTo(s, viewer));
  const firstDatedArrival = allOtherStops.find((s) => s.arrivalDate)?.arrivalDate ?? null;
  const tripDay = tripDayNumber(
    allOtherStops.find((s) => s.slug === slug)?.arrivalDate,
    firstDatedArrival,
  );

  const otherStops = allOtherStops.filter((s) => s.id !== stop.id);

  const prevStop = otherStops.filter((s) => s.order < stop.order).at(-1);
  const nextStop = otherStops.find((s) => s.order > stop.order);
  // Position picker input: the full sequence minus this stop. Person-agnostic
  // on purpose (see `itinerarySpine`), unlike the prev/next nav above.
  const spine = itinerarySpine(allStopsRaw, stop.id);
  const tripStartStr =
    tripStartSetting?.value ||
    (firstDatedArrival ? dateToStr(firstDatedArrival) : null);

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

  // Stay window — own dates, or the assumed gap between dated neighbors
  const stayWindow = assumedDateWindow(stop, allStopsRaw);

  // Tentative sunrise/sunset for the stay — pure local computation, no API.
  // A pseudo-city (Pititas) has no real coordinates → no sun/weather at all.
  const sunTimes = !stop.isLocal && stayWindow
    ? tentativeSunTimes(
        stop.latitude,
        stop.longitude,
        stayWindow.arrival,
        stayWindow.departure,
        stop.timezone,
      )
    : null;

  // "Current" is not the same as "here": on a day covered by no stay window —
  // the unbooked stretch after Nápoles, a transit day — the current stop is the
  // *next* one. Verify today is really inside [arrival, departure) before
  // counting down, or the page tells you you have 13 días acá in a city you
  // haven't reached.
  const isHere =
    isActive &&
    stop.arrivalDate != null &&
    stop.departureDate != null &&
    dateToStr(stop.arrivalDate) <= today &&
    today < dateToStr(stop.departureDate);

  // Top-right countdown while staying at this stop
  const daysLeft =
    isHere && stop.departureDate
      ? Math.max(0, daysBetween(today, dateToStr(stop.departureDate)))
      : null;

  const path = `/stops/${slug}`;

  return (
    <div className="min-h-full bg-canvas">
      <PageHeader subtitle={stop.name} actions={<PersonSwitcher person={viewer} />} />

      <main className="px-4 py-5 max-w-lg mx-auto space-y-4 pb-24">
        <HashScroller />
        {/* Publish the current stop to the TabBar so "Hoy" lights up here */}
        <CurrentStopSync slug={currentSlug} />

        {/* City header — the hero of this screen. border-2 is the signature
            width for the city card; "estás acá" turns it into the gold sticker
            (same treatment as the current-stop card in /stops). */}
        <div
          className={[
            "rounded-xl p-4 card-shadow border-2",
            isHere
              ? "bg-gold-bg/60 border-gold"
              : isActive
              ? "bg-surface border-border border-t-brick"
              : "bg-surface border-border",
          ].join(" ")}
        >
          <div className="flex items-center justify-between gap-3">
            {tripDay !== null ? (
              <p className={`label-caps ${isHere ? "text-gold-ink" : "text-ink-3"}`}>
                {isHere ? `Estás acá · Día ${tripDay} del viaje` : `Día ${tripDay} del viaje`}
              </p>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-2 shrink-0">
              {daysLeft !== null && (
                <p className="label-caps text-brick">
                  {/* isActive requires arrival <= today < departure, so daysLeft is
                      never 0 here: on the last night it's exactly 1. Keying "Última
                      noche" off 0 made it unreachable and showed "1 día acá". */}
                  {daysLeft === 1 ? "Última noche" : `${daysLeft} días acá`}
                </p>
              )}
              {isActive && !isHere && tripPhase !== "after" && (
                <Badge variant="special">Próxima parada</Badge>
              )}
              {stop.isCandidate && <Badge variant="special">tentativa</Badge>}
            </div>
          </div>

          <div className="flex items-center gap-3 mt-2">
            <Flag flag={stop.countryFlag} className="text-4xl" />
            <div className="min-w-0">
              <h1 className="text-3xl font-display uppercase text-ink leading-tight truncate">
                {stop.name}
              </h1>
              <p className="text-sm text-ink-2">{stop.country}</p>
            </div>
            {/* Edit trigger in the header's top-right slot — IconButton's quiet
                variant keeps the 44px target; negative margins hold density. */}
            <div className="ml-auto shrink-0 -m-2">
              <EditStopPanel
                stopId={stop.id}
                slug={stop.slug}
                name={stop.name}
                countryFlag={stop.countryFlag}
                nights={stop.nights}
                isCandidate={stop.isCandidate}
                isLocal={stop.isLocal}
                currentOrder={stop.order}
                allStops={spine}
                tripStartStr={tripStartStr}
              />
            </div>
          </div>

          {(stop.tempRange || sunTimes || stop.departureDate || stayWindow) && (
            <div className="mt-3 pt-3 border-t border-border/50 flex flex-wrap items-center gap-3 text-xs text-ink-3">
              {stop.departureDate ? (
                <span>Hasta el {formatShortDate(stop.departureDate)}</span>
              ) : (
                stayWindow && (
                  <span>Hasta el ≈{formatShortDate(stayWindow.departure)}</span>
                )
              )}
              {stop.tempRange && (
                <span className="flex items-center gap-1">
                  <Thermometer size={13} strokeWidth={1.5} aria-hidden="true" />
                  ≈{stop.tempRange}
                </span>
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
                "group flex-1 flex items-center gap-1.5 bg-surface border border-border card-shadow card-hover",
                "rounded-lg px-3 min-h-[44px] text-sm text-ink-2 hover:border-border-strong hover:text-ink hover:card-shadow-lg hover:-translate-y-[1px] motion-reduce:hover:translate-y-0",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick",
                "focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <ArrowLeft
                size={14}
                strokeWidth={1.5}
                aria-hidden="true"
                className="transition-transform duration-150 group-hover:-translate-x-0.5 motion-reduce:group-hover:translate-x-0"
              />
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
                "group flex-1 flex items-center justify-end gap-1.5 bg-surface border border-border card-shadow card-hover",
                "rounded-lg px-3 min-h-[44px] text-sm text-ink-2 hover:border-border-strong hover:text-ink hover:card-shadow-lg hover:-translate-y-[1px] motion-reduce:hover:translate-y-0 text-right",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick",
                "focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <Flag flag={nextStop.countryFlag} />{" "}
              {nextStop.name}
              <ArrowRight
                size={14}
                strokeWidth={1.5}
                aria-hidden="true"
                className="transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:group-hover:translate-x-0"
              />
            </Link>
          ) : (
            <div className="flex-1" />
          )}
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

        {/* Documents */}
        <div id="docs" className="scroll-mt-20">
          <DocumentsPanel
            stopId={stop.id}
            slug={stop.slug}
            documents={
              stop.documents.map((d) => ({
                ...d,
                docDate: d.docDate ? d.docDate.toISOString().slice(0, 10) : null,
              })) as Parameters<typeof DocumentsPanel>[0]["documents"]
            }
            path={path}
          />
        </div>

        {/* City guide */}
        <GuideCard stopSlug={stop.slug} />

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
 *  Extra guides (e.g. Costa Amalfitana from Nápoles) render as small links.
 *  When the stop is a city inside a regional guide (Bari inside Puglia), the
 *  chips are that city's docs and the region-wide ones follow. */
function GuideCard({ stopSlug }: { stopSlug: string }) {
  const [primary, ...extras] = guidesForStop(stopSlug);
  if (!primary) return null;

  const city = guideCityForStop(stopSlug);
  // City docs are the specific ones; the guide's own docs are region-wide and
  // repeat the same names ("Transporte"), so they get their own labelled row.
  // Desvíos cercanos stays on /guias — on /stops it crowded the 7-chip grid.
  const chips = stopGuideChips(city ? city.docs : primary.docs, city?.slug);
  const regionChips = city ? stopGuideChips(primary.docs) : [];

  return (
    <div className={`${cardClass} p-3.5 animate-fade-in`}>
      <Link
        href={`/guias/${primary.slug}`}
        className="flex items-center gap-2 min-h-[44px] group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick/40 rounded-lg"
      >
        <BookOpen size={16} strokeWidth={1.5} className="text-brick shrink-0" aria-hidden="true" />
        <span className="label-caps text-ink-3 shrink-0">
          Guía ·
        </span>
        <span className="flex-1 min-w-0 font-display uppercase text-title leading-tight text-ink truncate group-hover:text-brick-ink transition-colors duration-150">
          {city ? `${primary.title} · ${city.title}` : primary.title}
        </span>
        <ChevronRight size={14} strokeWidth={2} className="text-border-strong shrink-0" aria-hidden="true" />
      </Link>

      {chips.length > 0 && <DocChips guideSlug={primary.slug} docs={chips} />}

      {/* The stop *is* the region: point at the city groups inside its guide */}
      {!city && primary.cities.length > 0 && (
        <Link
          href={`/guias/${primary.slug}`}
          className="flex items-center gap-2 min-h-[44px] mt-2.5 rounded-lg border border-border bg-surface-2 px-3 py-2 transition-colors duration-150 hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick/40"
        >
          <span className="label-caps text-ink-3 shrink-0">
            {primary.cities.length} ciudades
          </span>
          <span className="flex-1 min-w-0 text-xs font-semibold text-ink-2 truncate">
            {primary.cities.map((c) => c.title).join(" · ")}
          </span>
          <ChevronRight size={14} strokeWidth={2} className="text-border-strong shrink-0" aria-hidden="true" />
        </Link>
      )}

      {regionChips.length > 0 && (
        <div className="mt-2.5">
          <p className="label-caps text-ink-3 mb-1.5">
            Toda {primary.title}
          </p>
          <DocChips guideSlug={primary.slug} docs={regionChips} flush />
        </div>
      )}

      {extras.length > 0 && (
        <div className="mt-2.5 pt-2.5 border-t border-border space-y-1">
          {extras.map((guide) => (
            <Link
              key={guide.slug}
              href={`/guias/${guide.slug}`}
              className="flex items-center gap-1.5 min-h-[44px] text-xs font-semibold text-ink-2 hover:text-ink transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick/40 rounded"
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

/** Docs shown as quick chips on the stop card. Hides Desvíos cercanos so the
 *  full 7-doc city set fits as a 2×3 grid; the doc remains on /guias. */
function stopGuideChips(docs: GuideDoc[], cityPrefix?: string): GuideDoc[] {
  return docs.filter((d) => docKind(d.slug, cityPrefix) !== "desvios-cercanos");
}

/** Doc shortcuts for a guide, as a 3-column grid: equal-width cells keep both
 *  edges of the block flush (a wrapping flex row ragged them against the card)
 *  and three per row keeps 6 docs at 2 rows. Every chip is a single truncated
 *  line — a wrapped title would make the row taller than the 44px touch target
 *  for no gain. The trailing chips stretch to fill the last row, so the block
 *  always closes as a rectangle. */
function DocChips({
  guideSlug,
  docs,
  flush,
}: {
  guideSlug: string;
  docs: GuideDoc[];
  flush?: boolean;
}) {
  const rest = docs.length % 3;
  return (
    <div className={`grid grid-cols-3 gap-1.5 ${flush ? "" : "mt-2.5"}`}>
      {docs.map((doc, i) => {
        const isLast = i === docs.length - 1;
        const span =
          isLast && rest === 1 ? "col-span-3" : isLast && rest === 2 ? "col-span-2" : "";
        return (
          <Link
            key={doc.slug}
            href={`/guias/${guideSlug}/${doc.slug}`}
            title={doc.title}
            className={`flex items-center justify-center min-w-0 h-11 rounded-full border border-border px-2 label-caps text-ink-2 transition-colors duration-150 hover:border-border-strong hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick/40 ${span}`}
          >
            <span className="truncate">{doc.title}</span>
          </Link>
        );
      })}
    </div>
  );
}

function formatShortDate(d: Date | string): string {
  return new Date(d).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

