/** The password gate of the production deploy (andiamo.lat).
 *
 *  `andiamo.lat` is printed on a CV, so `/login` is a public door with real
 *  personal data behind it. `LOGIN_PASSWORDS` holds a comma-separated list —
 *  more than one password stays valid at a time so a password can be rotated
 *  without locking anyone out mid-trip.
 *
 *  Kept out of `session.ts` on purpose: that module is imported by `proxy.ts`
 *  and therefore bundled for the edge runtime. The gate only ever runs inside
 *  the login Server Action, so its secret has no business travelling there.
 *
 *  The public demo (`IS_DEMO`) never reaches this code — free entry is the
 *  whole point of that deploy.
 */

import { secretsMatch } from "@/lib/session";

/** Parses the env list. Entries are trimmed and empties dropped, so a trailing
 *  comma or a stray space in the Railway UI can't create an empty password
 *  that would match an empty form field. */
export function getLoginPasswords(): string[] {
  return (process.env.LOGIN_PASSWORDS ?? "")
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

/** Fails closed: no configured password means nobody gets in, rather than
 *  everybody. Compares against *every* entry without short-circuiting — bailing
 *  on the first match leaks which password (and how many) exist through timing. */
export function isValidLoginPassword(input: string): boolean {
  if (!input) return false;
  const passwords = getLoginPasswords();
  if (passwords.length === 0) return false;

  let matched = false;
  for (const password of passwords) {
    if (secretsMatch(input, password)) matched = true;
  }
  return matched;
}
