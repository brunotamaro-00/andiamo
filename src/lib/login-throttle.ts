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

/** Hard cap on tracked keys. The key is the first token of `x-forwarded-for`,
 *  which the client controls, and `recent()` only prunes the key it is asked
 *  about — an entry for an address that never retries is never revisited.
 *  andiamo.lat is printed on a CV, so a scripted flood rotating that header
 *  would add one Map entry per request, forever, on a single long-lived
 *  process. Past the cap the oldest entries go; losing a stale window is
 *  harmless, running out of heap is not. */
const MAX_TRACKED_KEYS = 5_000;

const failures = new Map<string, number[]>();

function recent(key: string, now: number): number[] {
  const hits = (failures.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (hits.length === 0) failures.delete(key);
  else failures.set(key, hits);
  return hits;
}

/** Drops every expired window, then the oldest keys if still over the cap.
 *  Map preserves insertion order and `recordFailure` re-inserts on every hit,
 *  so the head of the iteration order is the least recently active key. */
function sweep(now: number): void {
  for (const [key, hits] of failures) {
    if (hits.every((t) => now - t >= WINDOW_MS)) failures.delete(key);
  }
  for (const key of failures.keys()) {
    if (failures.size <= MAX_TRACKED_KEYS) break;
    failures.delete(key);
  }
}

export function isThrottled(key: string): boolean {
  return recent(key, Date.now()).length >= MAX_FAILURES;
}

export function recordFailure(key: string): void {
  const now = Date.now();
  const hits = [...recent(key, now), now];
  // Re-insert at the tail so sweep()'s eviction order stays least-recent-first.
  failures.delete(key);
  failures.set(key, hits);
  if (failures.size > MAX_TRACKED_KEYS) sweep(now);
}

export function clearFailures(key: string): void {
  failures.delete(key);
}
