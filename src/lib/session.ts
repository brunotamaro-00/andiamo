import { createHmac } from "crypto";

export const SESSION_COOKIE_NAME = "trip_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 90; // 90 days

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    // A known fallback secret would let anyone forge the session cookie.
    throw new Error("SESSION_SECRET must be set in production");
  }
  return "dev-only-secret";
}

export function getExpectedToken(): string {
  return createHmac("sha256", getSecret()).update("authenticated").digest("hex");
}

/** Constant-time string comparison for secrets of unknown length — hashing both
 *  sides first hides the length difference that a bare `!==` would leak. */
export function secretsMatch(a: string, b: string): boolean {
  const ha = createHmac("sha256", getSecret()).update(a).digest("hex");
  const hb = createHmac("sha256", getSecret()).update(b).digest("hex");
  let result = 0;
  for (let i = 0; i < ha.length; i++) {
    result |= ha.charCodeAt(i) ^ hb.charCodeAt(i);
  }
  return result === 0;
}

/** Validates the X-Api-Key header of the machine-to-machine routes (Spitwise).
 *  Fails closed when TRIP_SHARED_API_KEY is unset, and compares in constant
 *  time — a bare `!==` short-circuits on the first differing byte. */
export function isValidApiKey(key: string | null): boolean {
  const expected = process.env.TRIP_SHARED_API_KEY;
  if (!key || !expected) return false;
  return secretsMatch(key, expected);
}

export function isValidToken(token: string): boolean {
  const expected = getExpectedToken();
  if (token.length !== expected.length) return false;
  // Constant-time comparison to prevent timing attacks
  let result = 0;
  for (let i = 0; i < expected.length; i++) {
    result |= expected.charCodeAt(i) ^ token.charCodeAt(i);
  }
  return result === 0;
}
