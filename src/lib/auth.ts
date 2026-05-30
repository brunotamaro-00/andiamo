import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE_NAME, isValidToken } from "./session";

/**
 * Server-only auth helpers. Kept separate from `session.ts` (which holds the
 * edge-safe crypto + constants imported by `proxy.ts`) so that `next/headers`
 * never ends up in the proxy/edge bundle.
 */

/**
 * Reads the session cookie and validates it.
 * Safe to call from Server Components, Server Actions and Route Handlers.
 */
export async function isAuthenticated(): Promise<boolean> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  return token ? isValidToken(token) : false;
}

/**
 * Guard for Server Components and Server Actions.
 * Redirects to /login when there is no valid session. Because `redirect()`
 * throws, code after `await requireAuth()` only runs for authenticated users.
 */
export async function requireAuth(): Promise<void> {
  if (!(await isAuthenticated())) {
    redirect("/login");
  }
}
