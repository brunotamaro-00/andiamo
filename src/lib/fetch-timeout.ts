/**
 * Timeouts for every outbound HTTP call.
 *
 * Neither Node's `fetch` nor the browser's has a default timeout, and the
 * failure mode that matters here isn't a refused connection — it's a hotel or
 * airport wifi that associates but doesn't route. The socket opens and nothing
 * ever comes back, so `fetch` neither resolves nor rejects and the `catch`
 * blocks that make these calls degrade gracefully never run. A render inside a
 * Suspense boundary streams forever, which also means the service worker never
 * gets a finished response to cache for offline.
 *
 * An abort turns that hang into the failure the calling code already handles.
 */

/** Interactive: someone is watching a spinner. */
export const TIMEOUT_INTERACTIVE_MS = 5_000;

/** Inside a page render — the response is held open until this resolves. */
export const TIMEOUT_RENDER_MS = 4_000;

/** Background work behind `after()`; wall time doesn't block anyone. */
export const TIMEOUT_BACKGROUND_MS = 10_000;

/**
 * `fetch` with an abort deadline, merged with any signal the caller passes.
 * On timeout it rejects with an AbortError, same shape as a network failure.
 */
export function fetchWithTimeout(
  input: string | URL,
  init: RequestInit & { next?: { revalidate?: number } } = {},
  timeoutMs: number = TIMEOUT_RENDER_MS,
): Promise<Response> {
  const timeout = AbortSignal.timeout(timeoutMs);
  const signal = init.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
  return fetch(input, { ...init, signal });
}
