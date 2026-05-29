"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { PoiType } from "@/generated/prisma/enums";

export async function createPoi(formData: FormData) {
  const stopId = formData.get("stopId") as string;
  const slug = formData.get("slug") as string;

  await db.poi.create({
    data: {
      stopId,
      name: formData.get("name") as string,
      type: (formData.get("type") as PoiType) ?? "otro",
      latitude: parseFloat(formData.get("latitude") as string),
      longitude: parseFloat(formData.get("longitude") as string),
      address: (formData.get("address") as string) || null,
      url: (formData.get("url") as string) || null,
      notes: (formData.get("notes") as string) || null,
      reservationRequired: formData.get("reservationRequired") === "true",
    },
  });

  revalidatePath(`/stops/${slug}`);
}

export async function togglePoiDone(id: string, slug: string) {
  const poi = await db.poi.findUnique({ where: { id }, select: { done: true } });
  if (!poi) return;
  await db.poi.update({ where: { id }, data: { done: !poi.done } });
  revalidatePath(`/stops/${slug}`);
}

export async function deletePoi(id: string, slug: string) {
  await db.poi.delete({ where: { id } });
  revalidatePath(`/stops/${slug}`);
}
