"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { currencyForCountry, flagFromCountryCode } from "@/lib/country-currency";
import { shiftOrders, PARKED_ORDER } from "@/lib/stop-order";
import { recalculateItinerary } from "@/lib/itinerary";
import { slugify } from "@/lib/slug";
import { parseForm, CreateStopSchema, UpdateStopSchema, TripStartSchema } from "./_schemas";

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
        datesFixed: false,
        isCandidate: false,
        isFlexMargin: false,
        isTransit: false,
        category: "Ciudad",
        priceLevel: "$$",
      },
    });
  });

  await recalculateItinerary();

  revalidatePath("/stops");
  revalidatePath("/hoy");
  redirect(`/stops/${slug}`);
}

/** Reorder transaction: park the moved stop, shift the affected range, place it. */
async function applyMove(id: string, afterOrder: number): Promise<void> {
  await db.$transaction(async (tx) => {
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
  });
}

/**
 * Updates a stop's fields and, when `afterOrder` is provided, reorders it in
 * the same mutation — a single recalculateItinerary instead of two round-trips.
 */
export async function updateStop(id: string, formData: FormData, afterOrder?: number) {
  await requireAuth();

  const parsed = parseForm(formData, UpdateStopSchema);
  if (!parsed.ok) return { error: parsed.error };
  const { name, nights, arrivalDate, datesFixed, isCandidate, isTransit, arrivalMode } =
    parsed.data;

  const current = await db.stop.findUnique({
    where: { id },
    select: { slug: true },
  });
  if (!current) return { error: "Parada no encontrada" };

  // For pinned stops, persist the user-supplied arrivalDate as the chain anchor.
  // For normal stops, leave arrivalDate untouched — recalculateItinerary will overwrite it.
  // Clearing it here would remove the bootstrap fallback before recalc can read existing dates.
  const extraFields = datesFixed ? { arrivalDate: arrivalDate ?? null, departureDate: null } : {};

  await db.stop.update({
    where: { id },
    data: { name, nights, datesFixed, isCandidate, isTransit, arrivalMode, ...extraFields },
  });

  if (afterOrder !== undefined) {
    await applyMove(id, afterOrder);
  }

  await recalculateItinerary();

  revalidatePath(`/stops/${current.slug}`);
  revalidatePath("/stops");
  revalidatePath("/hoy");
}

export async function deleteStop(id: string) {
  await requireAuth();
  const stop = await db.stop.findUnique({
    where: { id },
    select: { order: true, documents: { select: { storagePath: true } } },
  });
  if (!stop) return;

  await db.$transaction(async (tx) => {
    // Clear any manual current-stop override that pointed at the deleted stop
    await tx.setting.deleteMany({ where: { key: "manualCurrentStopId", value: id } });
    await tx.stop.delete({ where: { id } });
    await shiftOrders(tx, { gt: stop.order }, -1);
  });

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

  revalidatePath("/stops");
  revalidatePath("/hoy");
  redirect("/stops");
}

export async function setTripStart(formData: FormData): Promise<{ error?: string }> {
  await requireAuth();

  const parsed = parseForm(formData, TripStartSchema);
  if (!parsed.ok) return { error: parsed.error };
  const { tripStartDate } = parsed.data;

  await db.setting.upsert({
    where: { key: "tripStartDate" },
    create: { key: "tripStartDate", value: tripStartDate },
    update: { value: tripStartDate },
  });

  await recalculateItinerary();

  revalidatePath("/stops");
  revalidatePath("/hoy");
  return {};
}
