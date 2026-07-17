import { cookies } from "next/headers";
import { PERSON_COOKIE_NAME, isPerson, type PersonView } from "@/lib/person";

/** Current viewer, read from the cookie. Server-side only — kept out of
 *  person.ts so client components can import the shared constants there.
 *  Calling this opts a route into dynamic rendering: never use it from /guias,
 *  which must stay SSG. */
export async function getPerson(): Promise<PersonView> {
  const value = (await cookies()).get(PERSON_COOKIE_NAME)?.value;
  return isPerson(value) ? value : null;
}
