/** Who is looking at the expenses. This is a *view preference*, not hard auth:
 *  login is a Bruno/Katia picker (no password) and PersonSwitcher can still
 *  change the view freely. It exists so each of us sees our own share of the
 *  Spitwise ledger, and it must never gate anything else — every other surface
 *  (stops, notes, documents, guides) shows both of us exactly the same thing. */

export const PERSON_COOKIE_NAME = "trip_person";
export const PERSON_MAX_AGE = 60 * 60 * 24 * 365;

/** Usernames as they exist in Spitwise's `users` table — they are the join key
 *  for `?user=` on its API, so these strings must match it exactly. */
export const PEOPLE = ["bruno", "katia"] as const;

export type Person = (typeof PEOPLE)[number];

/** Con quién entra la demo pública. El visitante no elige — ver actions/auth.ts. */
export const DEMO_PERSON: Person = "bruno";

/** `null` means "ambos": household totals, the pre-selector behaviour. It is a
 *  real state, not just a fallback — a session from before this feature has no
 *  cookie and must keep working instead of guessing a person. */
export type PersonView = Person | null;

export function isPerson(value: string | undefined | null): value is Person {
  return PEOPLE.includes(value as Person);
}

export function personLabel(person: PersonView): string {
  return person === null ? "Ambos" : person.charAt(0).toUpperCase() + person.slice(1);
}

/** Whether a stop is visible to the given viewer.
 *
 *  Stops are shared by default (`ownerPerson === null`) — identical for both of
 *  us, the historical behaviour. A person-scoped stop (`ownerPerson` set to a
 *  Person) is only visible to its owner, so the itinerary *swaps*: while Bruno
 *  is in Portugal (Lisboa/Porto owned by "bruno") Katia sees "Pititas" (owned by
 *  "katia") in their place. "Ambos" (`viewer === null`) is the household superset
 *  and sees every stop. This is the single exception to "person only affects
 *  expenses" — keep it confined to this predicate. */
export function stopVisibleTo(
  stop: { ownerPerson: string | null },
  viewer: PersonView,
): boolean {
  if (viewer === null) return true; // "Ambos" ve todo
  if (stop.ownerPerson === null) return true; // parada compartida
  return stop.ownerPerson === viewer; // swap: solo la del dueño
}

/* Reading the cookie lives in person-server.ts: PersonSwitcher is a client
 * component and imports this module, so it must stay free of next/headers. */
