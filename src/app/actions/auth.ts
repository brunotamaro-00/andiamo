"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE, getExpectedToken } from "@/lib/session";

export async function login(formData: FormData) {
  const password = formData.get("password")?.toString() ?? "";
  const from = formData.get("from")?.toString() ?? "/";

  if (password !== process.env.APP_PASSWORD) {
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

  // Only allow single-slash internal paths — "//evil.com" and "/\evil.com"
  // are treated as protocol-relative URLs by the browser.
  const isSafePath = /^\/(?![/\\])/.test(from);
  redirect(isSafePath ? from : "/");
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  redirect("/login");
}
