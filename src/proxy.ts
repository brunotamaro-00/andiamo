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
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/documents|_next/static|_next/image|favicon.ico).*)"],
};
