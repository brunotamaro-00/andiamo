"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { currencyForCountry, flagFromCountryCode } from "@/lib/country-currency";
import { fetchTempRange } from "@/lib/temp-range";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
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
  const name = (formData.get("name") as string).trim();
  const country = (formData.get("country") as string).trim();
  const countryCode = (formData.get("countryCode") as string).trim().toUpperCase();
  const latitude = parseFloat(formData.get("latitude") as string);
  const longitude = parseFloat(formData.get("longitude") as string);
  const timezone = (formData.get("timezone") as string) || "auto";
  const nights = parseInt(formData.get("nights") as string) || 0;
  const arrivalRaw = formData.get("arrivalDate") as string | null;
  const insertAfterOrder = parseInt(formData.get("insertAfterOrder") as string) || 0;

  const currencyCode = currencyForCountry(countryCode);
  const countryFlag = flagFromCountryCode(countryCode);
  const slug = await uniqueSlug(slugify(name));

  const arrivalDate = arrivalRaw ? new Date(arrivalRaw) : null;
  let departureDate: Date | null = null;
  if (arrivalDate && nights > 0) {
    departureDate = new Date(arrivalDate);
    departureDate.setDate(departureDate.getDate() + nights);
  }

  const tempRange = await fetchTempRange(latitude, longitude, arrivalDate, departureDate);

  const newOrder = insertAfterOrder + 1;

  await db.$transaction(async (tx) => {
    // Shift existing stops up using large offset to avoid unique constraint collisions
    const stopsToShift = await tx.stop.findMany({
      where: { order: { gte: newOrder } },
      select: { id: true, order: true },
      orderBy: { order: "desc" },
    });

    const OFFSET = 10000;
    for (const s of stopsToShift) {
      await tx.stop.update({ where: { id: s.id }, data: { order: s.order + OFFSET } });
    }
    for (const s of stopsToShift) {
      await tx.stop.update({ where: { id: s.id }, data: { order: s.order + 1 } });
    }

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
        arrivalDate,
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
  const name = (formData.get("name") as string).trim();
  const nights = parseInt(formData.get("nights") as string) || 0;
  const arrivalRaw = formData.get("arrivalDate") as string | null;
  const datesFixed = formData.get("datesFixed") === "true";
  const isCandidate = formData.get("isCandidate") === "true";

  const current = await db.stop.findUnique({
    where: { id },
    select: { slug: true, latitude: true, longitude: true, tempRange: true },
  });
  if (!current) return;

  const arrivalDate = arrivalRaw ? new Date(arrivalRaw) : null;
  let departureDate: Date | null = null;
  if (arrivalDate && nights > 0) {
    departureDate = new Date(arrivalDate);
    departureDate.setDate(departureDate.getDate() + nights);
  }

  const tempRange =
    (await fetchTempRange(current.latitude, current.longitude, arrivalDate, departureDate)) ??
    current.tempRange;

  await db.stop.update({
    where: { id },
    data: { name, arrivalDate, departureDate, nights, datesFixed, isCandidate, tempRange },
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

    const OFFSET = 10000;

    if (afterOrder > currentOrder) {
      // Moving down — shift intermediate stops up by one slot
      const toShift = await tx.stop.findMany({
        where: { order: { gt: currentOrder, lte: afterOrder } },
        select: { id: true, order: true },
        orderBy: { order: "asc" },
      });
      for (const s of toShift) await tx.stop.update({ where: { id: s.id }, data: { order: s.order + OFFSET } });
      for (const s of toShift) await tx.stop.update({ where: { id: s.id }, data: { order: s.order - 1 } });
      await tx.stop.update({ where: { id }, data: { order: afterOrder } });
    } else {
      // Moving up — shift intermediate stops down by one slot
      const toShift = await tx.stop.findMany({
        where: { order: { gt: afterOrder, lt: currentOrder } },
        select: { id: true, order: true },
        orderBy: { order: "desc" },
      });
      for (const s of toShift) await tx.stop.update({ where: { id: s.id }, data: { order: s.order + OFFSET } });
      for (const s of toShift) await tx.stop.update({ where: { id: s.id }, data: { order: s.order + 1 } });
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

    const stopsAfter = await tx.stop.findMany({
      where: { order: { gt: stop.order } },
      select: { id: true, order: true },
      orderBy: { order: "asc" },
    });

    const OFFSET = 10000;
    for (const s of stopsAfter) {
      await tx.stop.update({ where: { id: s.id }, data: { order: s.order + OFFSET } });
    }
    for (const s of stopsAfter) {
      await tx.stop.update({ where: { id: s.id }, data: { order: s.order - 1 } });
    }
  });

  revalidatePath("/stops");
  redirect("/stops");
}
