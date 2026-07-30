/** In-memory brute-force throttle for the login gate.
 *
 *  The service runs as a single Next standalone process on Railway, so a module
 *  level Map is shared by every request — no Redis, no table. State is lost on
 *  redeploy, which is fine: the window is 10 minutes.
 */

const MAX_FAILURES = 8;
const WINDOW_MS = 10 * 60 * 1000;
/** Blunts both timing analysis and rapid-fire scripted retries. */
export const FAILURE_DELAY_MS = 300;

const failures = new Map<string, number[]>();

function recent(key: string, now: number): number[] {
  const hits = (failures.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (hits.length === 0) failures.delete(key);
  else failures.set(key, hits);
  return hits;
}

export function isThrottled(key: string): boolean {
  return recent(key, Date.now()).length >= MAX_FAILURES;
}

export function recordFailure(key: string): void {
  const now = Date.now();
  failures.set(key, [...recent(key, now), now]);
}

export function clearFailures(key: string): void {
  failures.delete(key);
}
