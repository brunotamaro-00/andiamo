import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, isValidToken } from "@/lib/session";

// /sw.js must be public: browsers refuse to register a service worker whose
// script is behind a redirect, so the PWA could never install pre-login.
const PUBLIC_PATHS = ["/login", "/_next", "/favicon.ico", "/manifest.json", "/manifest.webmanifest", "/icon-", "/apple-icon", "/robots.txt", "/sw.js", "/offline.html", "/logo.svg"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value ?? "";

  if (!isValidToken(token)) {
    // fetch() from client code can't use a redirect-to-login — it would parse
    // the login HTML as JSON. Fail with a clean 401 instead.
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Spitwise integration routes authenticate with X-Api-Key in the handler —
  // they must bypass the session cookie gate (same as /api/stops).
  matcher: [
    "/((?!api/documents|api/stops|api/notes|api/guides|api/integration|_next/static|_next/image|favicon.ico).*)",
  ],
};
