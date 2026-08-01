"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { db, isRecordMissing, isUniqueViolation } from "@/lib/db";
import { notifyStopsChanged } from "@/lib/spitwise";
import { requireAuth } from "@/lib/auth";
import { currencyForCountry, flagFromCountryCode } from "@/lib/country-currency";
import { shiftOrders, PARKED_ORDER, type Tx } from "@/lib/stop-order";
import { recalculateItinerary } from "@/lib/itinerary";
import { slugify } from "@/lib/slug";
import { parseForm, CreateStopSchema, UpdateStopSchema, TripStartSchema } from "./_schemas";

// INVARIANT: a stop's slug is set once at creation and never changes —
// Spitwise joins expenses to stops by slug. If slug editing is ever
// added, treat it as delete + create (the archive semantics handle that).
async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
  let slug = base;
  let i = 2;
  while (true) {
    const existing = await db.stop.findUnique({ where: { slug }, select: { id: true } });
    if (!existing || existing.id === excludeId) return slug;
    slug = `${base}-${i}`;
    i++;
  }
}

export async function createStop(formData: FormData) {
  await requireAuth();

  const parsed = parseForm(formData, CreateStopSchema);
  if (!parsed.ok) return { error: parsed.error };
  const { name, country, countryCode, latitude, longitude, timezone, nights, insertAfterOrder } =
    parsed.data;

  const currencyCode = currencyForCountry(countryCode);
  const countryFlag = flagFromCountryCode(countryCode);
  const slug = await uniqueSlug(slugify(name));
  const newOrder = insertAfterOrder + 1;

  try {
    await db.$transaction(async (tx) => {
      await shiftOrders(tx, { gte: newOrder }, +1);
      await tx.stop.create({
        data: {
          order: newOrder,
          name,
          slug,
          country,
          countryFlag,
          currencyCode,
          latitude,
          longitude,
          timezone,
          nights,
          arrivalDate: null,
          departureDate: null,
          isCandidate: false,
          isFlexMargin: false,
          category: "Ciudad",
          priceLevel: "$$",
        },
      });
    });
  } catch (e) {
    // uniqueSlug reads outside the transaction and `order` is @unique too, so a
    // double tap on a slow connection races itself into a P2002. Expected
    // failure, not a 500: the second tap simply loses.
    if (isUniqueViolation(e)) {
      return { error: "Esa parada ya existe o se creó otra al mismo tiempo. Probá de nuevo." };
    }
    throw e;
  }

  const recalc = await recalculateItinerary();
  if (recalc.error) return recalc;
  // Registered before redirect() (which throws NEXT_REDIRECT); runs post-response.
  after(() => notifyStopsChanged());

  revalidatePath("/stops");
  redirect(`/stops/${slug}`);
}

/** Reorder within the caller's transaction: park the moved stop, shift the
 *  affected range, place it. Takes the tx so it commits atomically with the
 *  field update it accompanies. */
async function applyMove(tx: Tx, id: string, afterOrder: number): Promise<void> {
  // afterOrder arrives as a function argument, not FormData, so no Zod schema
  // guards it. A value below 0 makes the shift range swallow the parked stop
  // itself (PARKED_ORDER = -1) and hands it a negative order. 0 means "first".
  if (!Number.isInteger(afterOrder) || afterOrder < 0) return;

  const stop = await tx.stop.findUnique({ where: { id }, select: { order: true } });
  if (!stop) return;

  const currentOrder = stop.order;
  if (afterOrder === currentOrder - 1 || afterOrder === currentOrder) return;

  // Park the moved stop so the shifted range can occupy its old slot
  await tx.stop.update({ where: { id }, data: { order: PARKED_ORDER } });
  if (afterOrder > currentOrder) {
    await shiftOrders(tx, { gt: currentOrder, lte: afterOrder }, -1);
    await tx.stop.update({ where: { id }, data: { order: afterOrder } });
  } else {
    await shiftOrders(tx, { gt: afterOrder, lt: currentOrder }, +1);
    await tx.stop.update({ where: { id }, data: { order: afterOrder + 1 } });
  }
}

/**
 * Updates a stop's fields and, when `afterOrder` is provided, reorders it in
 * the same mutation — a single recalculateItinerary instead of two round-trips.
 */
export async function updateStop(id: string, formData: FormData, afterOrder?: number) {
  await requireAuth();

  const parsed = parseForm(formData, UpdateStopSchema);
  if (!parsed.ok) return { error: parsed.error };
  const { name, nights, isCandidate } = parsed.data;

  const current = await db.stop.findUnique({
    where: { id },
    select: { slug: true },
  });
  if (!current) return { error: "Parada no encontrada" };

  try {
    // Field update and reorder in one transaction. Split apart, a P2002 from a
    // concurrent reorder committed the new nights but skipped the recalculation
    // below, leaving every stop's dates stale with nothing to signal it.
    await db.$transaction(async (tx) => {
      await tx.stop.update({
        where: { id },
        data: { name, nights, isCandidate },
      });
      if (afterOrder !== undefined) await applyMove(tx, id, afterOrder);
    });
  } catch (e) {
    // The findUnique above is not a lock: the stop can be deleted in between,
    // and an uncaught P2025 here would 500 instead of returning { error }.
    if (isRecordMissing(e)) return { error: "Parada no encontrada" };
    throw e;
  }

  const recalc = await recalculateItinerary();
  if (recalc.error) return recalc;
  after(() => notifyStopsChanged());

  revalidatePath(`/stops/${current.slug}`);
  revalidatePath("/stops");
  // Every other stop's dates can have moved too — their cached detail pages
  // would keep the old arrival and countdown for the whole staleTimes window.
  revalidatePath("/stops/[slug]", "page");
  revalidatePath("/search");
}

export async function deleteStop(id: string) {
  await requireAuth();
  const stop = await db.stop.findUnique({
    where: { id },
    select: { order: true, documents: { select: { storagePath: true } } },
  });
  // Already gone (double-tap, or deleted in another tab) — that's the desired
  // state, so redirect like the success path. Returning undefined left the
  // caller with no error, no redirect and an open modal stuck on "Borrando…".
  if (!stop) redirect("/stops");

  try {
    await db.$transaction(async (tx) => {
      // Clear any manual current-stop override that pointed at the deleted stop
      await tx.setting.deleteMany({ where: { key: "manualCurrentStopId", value: id } });
      await tx.stop.delete({ where: { id } });
      await shiftOrders(tx, { gt: stop.order }, -1);
    });
  } catch (e) {
    // The findUnique above is not a lock. A concurrent delete (other tab, double
    // tap on the confirm dialog) makes this P2025 — but the stop *is* gone,
    // which is what was asked for. Surfacing "no se pudo borrar" over a
    // successful delete left the modal open on a stop that no longer existed.
    if (!isRecordMissing(e)) throw e;
  }

  // The DB cascade removed the Document rows; delete their R2 objects only
  // after the transaction commits so a rollback can't lose files.
  const keys = stop.documents
    .map((d) => d.storagePath)
    .filter((k): k is string => Boolean(k));
  if (keys.length > 0) {
    const { deleteFromR2 } = await import("@/lib/r2");
    await Promise.allSettled(keys.map((k) => deleteFromR2(k)));
  }

  await recalculateItinerary();
  after(() => notifyStopsChanged());

  revalidatePath("/stops");
  revalidatePath("/stops/[slug]", "page");
  // The cascade took this stop's notes and documents with it; /search indexes
  // their text and would keep listing rows that now lead to a 404.
  revalidatePath("/search");
  redirect("/stops");
}

export async function setTripStart(formData: FormData): Promise<{ error?: string }> {
  await requireAuth();

  const parsed = parseForm(formData, TripStartSchema);
  if (!parsed.ok) return { error: parsed.error };
  const { tripStartDate } = parsed.data;

  // This Setting is the trip's only date input: every stop's arrival and
  // departure is derived from it by the itinerary walk, so moving it is
  // *meant* to shift the whole trip.
  await db.setting.upsert({
    where: { key: "tripStartDate" },
    create: { key: "tripStartDate", value: tripStartDate },
    update: { value: tripStartDate },
  });

  const recalc = await recalculateItinerary();
  if (recalc.error) return recalc;
  after(() => notifyStopsChanged());

  revalidatePath("/stops");
  revalidatePath("/stops/[slug]", "page");
  return {};
}
