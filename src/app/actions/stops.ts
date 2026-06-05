"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { currencyForCountry, flagFromCountryCode } from "@/lib/country-currency";
import { fetchTempRange } from "@/lib/temp-range";
import { shiftOrders } from "@/lib/stop-order";
import { parseForm, CreateStopSchema, UpdateStopSchema } from "./_schemas";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

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
  const { name, country, countryCode, latitude, longitude, timezone, nights, arrivalDate, insertAfterOrder } = parsed.data;

  const currencyCode = currencyForCountry(countryCode);
  const countryFlag = flagFromCountryCode(countryCode);
  const slug = await uniqueSlug(slugify(name));

  let departureDate: Date | null = null;
  if (arrivalDate && nights > 0) {
    departureDate = new Date(arrivalDate);
    departureDate.setDate(departureDate.getDate() + nights);
  }

  const tempRange = await fetchTempRange(latitude, longitude, arrivalDate ?? null, departureDate);
  const newOrder = insertAfterOrder + 1;

  await db.$transaction(async (tx) => {
    // Shift stops at newOrder and above to make room
    await shiftOrders(tx, { gte: newOrder }, +1, "desc");

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
        arrivalDate: arrivalDate ?? null,
        departureDate,
        tempRange,
        datesFixed: false,
        isCandidate: false,
        isFlexMargin: false,
        isTransit: false,
        category: "Ciudad",
        priceLevel: "$$",
      },
    });
  });

  revalidatePath("/stops");
  redirect(`/stops/${slug}`);
}

export async function updateStop(id: string, formData: FormData) {
  await requireAuth();

  const parsed = parseForm(formData, UpdateStopSchema);
  if (!parsed.ok) return { error: parsed.error };
  const { name, nights, arrivalDate, datesFixed, isCandidate, isTransit, arrivalMode } = parsed.data;

  const current = await db.stop.findUnique({
    where: { id },
    select: { slug: true, latitude: true, longitude: true, tempRange: true },
  });
  if (!current) return { error: "Parada no encontrada" };

  let departureDate: Date | null = null;
  if (arrivalDate && nights > 0) {
    departureDate = new Date(arrivalDate);
    departureDate.setDate(departureDate.getDate() + nights);
  }

  const tempRange =
    (await fetchTempRange(current.latitude, current.longitude, arrivalDate ?? null, departureDate)) ??
    current.tempRange;

  await db.stop.update({
    where: { id },
    data: { name, arrivalDate: arrivalDate ?? null, departureDate, nights, datesFixed, isCandidate, isTransit, tempRange, arrivalMode },
  });

  revalidatePath(`/stops/${current.slug}`);
  revalidatePath("/stops");
}

export async function moveStop(id: string, afterOrder: number) {
  await requireAuth();
  await db.$transaction(async (tx) => {
    const stop = await tx.stop.findUnique({ where: { id }, select: { order: true } });
    if (!stop) return;

    const currentOrder = stop.order;
    if (afterOrder === currentOrder - 1 || afterOrder === currentOrder) return;

    if (afterOrder > currentOrder) {
      // Moving down — shift intermediate stops up by one
      await shiftOrders(tx, { gt: currentOrder, lte: afterOrder }, -1, "asc");
      await tx.stop.update({ where: { id }, data: { order: afterOrder } });
    } else {
      // Moving up — shift intermediate stops down by one
      await shiftOrders(tx, { gt: afterOrder, lt: currentOrder }, +1, "desc");
      await tx.stop.update({ where: { id }, data: { order: afterOrder + 1 } });
    }
  });

  revalidatePath("/stops");
}

export async function deleteStop(id: string) {
  await requireAuth();
  const stop = await db.stop.findUnique({ where: { id }, select: { order: true } });
  if (!stop) return;

  await db.$transaction(async (tx) => {
    await tx.stop.delete({ where: { id } });
    // Close the gap: shift all stops above down by one
    await shiftOrders(tx, { gt: stop.order }, -1, "asc");
  });

  revalidatePath("/stops");
  redirect("/stops");
}
