"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { IS_DEMO } from "@/lib/demo";
import { isValidLoginPassword } from "@/lib/login-passwords";
import { FAILURE_DELAY_MS, clearFailures, isThrottled, recordFailure } from "@/lib/login-throttle";
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE, getExpectedToken } from "@/lib/session";
import { DEMO_PERSON, PERSON_COOKIE_NAME, PERSON_MAX_AGE } from "@/lib/person";

/** Error codes the login page renders as copy — never echo back what was typed. */
export type LoginError = "password" | "empty" | "throttled";

function fail(error: LoginError, from: string): never {
  redirect(`/login?error=${error}&from=${encodeURIComponent(from)}`);
}

/** Railway sits behind a proxy, so the socket address is always the proxy's.
 *  A spoofable header is good enough here: the throttle is a speed bump on top
 *  of a real password, not an authorization decision. */
async function clientKey(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

export async function login(formData: FormData) {
  const from = formData.get("from")?.toString() ?? "/";

  // The public demo is meant to be walked into — the gate only guards prod.
  if (!IS_DEMO) {
    const key = await clientKey();
    if (isThrottled(key)) {
      fail("throttled", from);
    }
    const password = formData.get("password")?.toString() ?? "";
    // Un campo vacío es un olvido, no un intento fallido: ni cuenta para el
    // throttle ni merece "contraseña incorrecta".
    if (!password) {
      fail("empty", from);
    }
    if (!isValidLoginPassword(password)) {
      recordFailure(key);
      await new Promise((r) => setTimeout(r, FAILURE_DELAY_MS));
      fail("password", from);
    }
    clearFailures(key);
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, getExpectedToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });

  // Quién sos no se decide acá: el login es solo la puerta. En producción la
  // cookie `trip_person` (365 días) sobrevive a que expire la sesión, así que en
  // un dispositivo propio no hay nada que volver a elegir; si no está,
  // PersonSwitcher pregunta una vez ya adentro.
  // La demo no pregunta nunca: quien llega desde el CV no sabe quiénes somos, y
  // esa elección sería el único obstáculo entre él y la app.
  if (IS_DEMO) {
    cookieStore.set(PERSON_COOKIE_NAME, DEMO_PERSON, {
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
