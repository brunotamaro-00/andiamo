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
