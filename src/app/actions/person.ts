"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { PERSON_COOKIE_NAME, PERSON_MAX_AGE, isPerson } from "@/lib/person";

/** Switch whose share of the Spitwise ledger is shown. Not a security
 *  boundary (see lib/person.ts) — it still requires a valid session because
 *  every action here does. */
export async function setPerson(value: string): Promise<{ error: string } | void> {
  await requireAuth();

  const cookieStore = await cookies();
  if (value === "ambos") {
    cookieStore.delete(PERSON_COOKIE_NAME);
  } else if (isPerson(value)) {
    cookieStore.set(PERSON_COOKIE_NAME, value, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: PERSON_MAX_AGE,
      path: "/",
    });
  } else {
    return { error: "Persona inválida" };
  }

  // Spend surface: every stop detail panel reflects the new person view.
  revalidatePath("/stops/[slug]", "page");
  // Person also swaps which *stops* are visible (stopVisibleTo — the Pititas
  // swap), so the itinerary list and search results change too. Without these,
  // staleTimes.dynamic kept showing the previous person's stops for up to 30s.
  revalidatePath("/stops");
  revalidatePath("/search");
}
