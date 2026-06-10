// Andiamo Service Worker v3
// Strategy summary:
//   /api/documents/*  GET  → cache-first (offline-capable document files)
//   Navigation + /_next/static/ → stale-while-revalidate (app shell)
//   Everything else → network-only (auth-gated API routes)
// Weather/rates now arrive server-rendered inside the page HTML.

const DOCS_CACHE  = "andiamo-docs-v1";
const SHELL_CACHE = "andiamo-shell-v3";   // bumped: SWR navigations, no data cache
const OFFLINE_URL = "/offline.html";

const KNOWN_CACHES = [DOCS_CACHE, SHELL_CACHE];

// Shell routes to precache on install so the app works offline from first load.
const SHELL_ROUTES = [
  "/",
  "/stops",
  "/map",
  "/general",
  "/search",
  OFFLINE_URL,
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ROUTES))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
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

  // ── 1. Document files — cache-first ──────────────────────────────────────
  if (url.pathname.startsWith("/api/documents/") && request.method === "GET") {
    event.respondWith(cacheFirstDocs(request));
    return;
  }

  // ── 2. Navigation — stale-while-revalidate (app shell) ───────────────────
  if (request.mode === "navigate") {
    event.respondWith(navigateWithFallback(request));
    return;
  }

  // ── 3. Next.js static assets — stale-while-revalidate ────────────────────
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(staleWhileRevalidate(SHELL_CACHE, request));
    return;
  }

  // Everything else: network-only (auth API routes, mutations, etc.)
});

/** Cache-first for uploaded document files.
 *  - Serve from cache immediately if available (works offline).
 *  - On cache miss, fetch and cache only non-redirected 200 responses. */
async function cacheFirstDocs(request) {
  const cache = await caches.open(DOCS_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok && !response.redirected && response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return offlinePage();
  }
}

/** Stale-while-revalidate: serve cached version immediately, update in background. */
async function staleWhileRevalidate(cacheName, request) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const networkFetch = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  // Return cached immediately; if nothing cached, await the network fetch.
  return cached ?? (await networkFetch) ?? offlinePage();
}

/** Navigation: serve cached shell instantly, revalidate in background.
 *  Hard loads on a slow network stop waiting for the server; the fresh
 *  page replaces the cached copy for the next visit. */
async function navigateWithFallback(request) {
  const cache = await caches.open(SHELL_CACHE);
  const cached = await cache.match(request);

  const networkFetch = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  if (cached) return cached;
  return (await networkFetch) ?? offlinePage();
}

/** Returns the offline fallback HTML page. */
async function offlinePage() {
  const cache = await caches.open(SHELL_CACHE);
  const cached = await cache.match(OFFLINE_URL);
  return (
    cached ??
    new Response("Sin conexión", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    })
  );
}
