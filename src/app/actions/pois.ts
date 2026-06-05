"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { PoiType } from "@/generated/prisma/enums";
import { parseForm, CreatePoiSchema, UpdatePoiSchema } from "./_schemas";

export async function createPoi(formData: FormData) {
  await requireAuth();

  const parsed = parseForm(formData, CreatePoiSchema);
  if (!parsed.ok) return { error: parsed.error };
  const { stopId, slug, name, type, latitude, longitude, address, url, notes, reservationRequired } = parsed.data;

  await db.poi.create({
    data: {
      stop: { connect: { id: stopId } },
      name,
      type: (type as PoiType) ?? "otro",
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      address: address ?? null,
      url: url ?? null,
      notes: notes ?? null,
      reservationRequired,
    },
  });

  revalidatePath(`/stops/${slug}`);
  revalidatePath("/stops");
  revalidatePath("/search");
}

export async function togglePoiDone(id: string, slug: string) {
  await requireAuth();
  const poi = await db.poi.findUnique({ where: { id }, select: { done: true } });
  if (!poi) return;
  await db.poi.update({ where: { id }, data: { done: !poi.done } });
  revalidatePath(`/stops/${slug}`);
}

export async function updatePoi(id: string, formData: FormData) {
  await requireAuth();

  const parsed = parseForm(formData, UpdatePoiSchema);
  if (!parsed.ok) return { error: parsed.error };
  const { slug, name, type, latitude, longitude, address, url, notes, reservationRequired } = parsed.data;

  await db.poi.update({
    where: { id },
    data: {
      name,
      type: (type as PoiType) ?? "otro",
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      address: address ?? null,
      url: url ?? null,
      notes: notes ?? null,
      reservationRequired,
    },
  });

  revalidatePath(`/stops/${slug}`);
  revalidatePath("/search");
}

export async function deletePoi(id: string, slug: string) {
  await requireAuth();
  await db.poi.delete({ where: { id } });
  revalidatePath(`/stops/${slug}`);
  revalidatePath("/search");
}
