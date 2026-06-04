// Andiamo Service Worker
// Docs: cache-first for uploaded documents (cache-on-view)
// Shell: stale-while-revalidate for navigation + Next.js static assets

const DOCS_CACHE = "andiamo-docs-v1";
const SHELL_CACHE = "andiamo-shell-v1";
const KNOWN_CACHES = [DOCS_CACHE, SHELL_CACHE];

self.addEventListener("install", () => {
  // Take control immediately without waiting for old SW to die
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Clean up caches from old versions
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !KNOWN_CACHES.includes(key))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // ── 1. Document uploads — cache-first ────────────────────────────────────
  if (url.pathname.startsWith("/api/documents/") && request.method === "GET") {
    event.respondWith(cacheFirstDocs(request));
    return;
  }

  // ── 2. Navigation requests — stale-while-revalidate ──────────────────────
  if (request.mode === "navigate") {
    event.respondWith(staleWhileRevalidate(SHELL_CACHE, request));
    return;
  }

  // ── 3. Next.js static assets — stale-while-revalidate ────────────────────
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(staleWhileRevalidate(SHELL_CACHE, request));
    return;
  }

  // Everything else: network-only (API routes with auth, etc.)
});

/** Cache-first for uploaded document files.
 *  - Serve from cache immediately if available (works offline).
 *  - On a cache miss, fetch from network; cache only non-redirected 200 responses
 *    (redirects are links to external URLs — can't cache those).
 */
async function cacheFirstDocs(request) {
  const cache = await caches.open(DOCS_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    // Only cache actual file responses (status 200, not redirects to external URLs)
    if (response.ok && !response.redirected && response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Network failure and nothing in cache — let the browser show its own error
    return new Response("Sin conexión — este documento no está guardado offline.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

/** Stale-while-revalidate: serve cached version immediately, update cache in background. */
async function staleWhileRevalidate(cacheName, request) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const networkFetch = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  return cached ?? (await networkFetch) ?? new Response("Sin conexión", { status: 503 });
}
