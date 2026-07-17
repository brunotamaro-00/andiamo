"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE, getExpectedToken, secretsMatch } from "@/lib/session";
import { PERSON_COOKIE_NAME, PERSON_MAX_AGE, isPerson } from "@/lib/person";

export async function login(formData: FormData) {
  const password = formData.get("password")?.toString() ?? "";
  const from = formData.get("from")?.toString() ?? "/";
  const person = formData.get("person")?.toString() ?? "";

  const expected = process.env.APP_PASSWORD;
  if (!expected || !secretsMatch(password, expected)) {
    redirect(`/login?error=1&from=${encodeURIComponent(from)}`);
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, getExpectedToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });

  // Only affects which share of the expenses is shown; an unrecognised value
  // just means "ambos" rather than failing a login that is otherwise valid.
  if (isPerson(person)) {
    cookieStore.set(PERSON_COOKIE_NAME, person, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: PERSON_MAX_AGE,
      path: "/",
    });
  }

  // Only allow single-slash internal paths — "//evil.com" and "/\evil.com"
  // are treated as protocol-relative URLs by the browser.
  const isSafePath = /^\/(?![/\\])/.test(from);
  redirect(isSafePath ? from : "/");
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  // The next login picks a person again — don't leave one selected for whoever
  // logs in next on a shared device.
  cookieStore.delete(PERSON_COOKIE_NAME);
  redirect("/login");
}
