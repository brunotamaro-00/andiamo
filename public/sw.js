// Andiamo Service Worker v5
// Strategy summary:
//   /api/documents/*  GET  → cache-first (offline-capable document files)
//   Navigation             → network-first (fresh data online, cached shell offline)
//   /_next/static/         → stale-while-revalidate (immutable build assets)
//   Everything else        → network-only (auth-gated API routes, RSC payloads)
// Weather/rates arrive server-rendered inside the page HTML.
//
// "Descargar viaje" (PRECACHE_TRIP message) warms the trip cache with every
// stop/guide page HTML + uploaded document, so airplane mode stays readable.

const DOCS_CACHE  = "andiamo-docs-v1";
const SHELL_CACHE = "andiamo-shell-v12";   // bumped: navigation is now network-first
const TRIP_CACHE  = "andiamo-trip-v1";     // on-demand precache of stop/guide route HTML
const OFFLINE_URL = "/offline.html";

const KNOWN_CACHES = [DOCS_CACHE, SHELL_CACHE, TRIP_CACHE];

// Shell routes to precache on install so the app works offline from first load.
// "/" and "/hoy" are intentionally excluded: both issue a redirect (→ the
// current stop or /login), and a redirected response cannot be returned to a
// navigation request — doing so triggers ERR_FAILED.
const SHELL_ROUTES = [
  "/stops",
  "/guias",
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

self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || typeof data !== "object") return;

  // Logout asks for a full cache wipe so cached authenticated pages
  // can't be served after the session cookie is gone.
  if (data.type === "CLEAR_ALL_CACHES") {
    event.waitUntil(
      caches
        .keys()
        .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
        .then(() => event.ports[0]?.postMessage({ done: true }))
    );
    return;
  }

  // "Descargar viaje": warm the trip + docs caches with the given URLs,
  // reporting progress back over the MessageChannel port.
  if (data.type === "PRECACHE_TRIP") {
    event.waitUntil(precacheTrip(data.routes ?? [], data.docs ?? [], event.ports[0]));
    return;
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // ── 1. Document files — cache-first ──────────────────────────────────────
  if (url.pathname.startsWith("/api/documents/") && request.method === "GET") {
    event.respondWith(cacheFirstDocs(request));
    return;
  }

  // ── 2. Navigation — network-first (fresh online, cached shell offline) ────
  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigate(request, url));
    return;
  }

  // ── 3. Next.js static assets — stale-while-revalidate ────────────────────
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(staleWhileRevalidate(SHELL_CACHE, request));
    return;
  }

  // Everything else: network-only (auth API routes, RSC payloads, mutations).
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
      if (response.ok && !response.redirected) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  // Return cached immediately; if nothing cached, await the network fetch.
  return cached ?? (await networkFetch) ?? offlinePage();
}

/** Navigation: network-first so online visits always render fresh data (the
 *  pages are force-dynamic). The fresh HTML is cached for offline use. When the
 *  network fails, fall back to the cached copy, then the offline page.
 *
 *  Offline soft navigations in the App Router fail their RSC fetch and Next
 *  falls back to a hard navigation, which lands here and is served from cache. */
async function networkFirstNavigate(request, url) {
  const shell = await caches.open(SHELL_CACHE);
  const trip = await caches.open(TRIP_CACHE);

  try {
    const response = await fetch(request);
    // Never cache a redirected response: returning one to a navigation request
    // fails with ERR_FAILED. Store fresh HTML in the trip cache for offline.
    if (response.ok && !response.redirected) {
      trip.put(request, response.clone());
    }
    return response;
  } catch {
    // Offline: serve the cached copy of this exact route if we have one.
    const cached = (await trip.match(request)) ?? (await shell.match(request));
    if (cached && !cached.redirected) return cached;

    // "/" and "/hoy" redirect server-side and can't be cached — offline, fall
    // back to the itinerary as the entry point.
    if (url.pathname === "/" || url.pathname === "/hoy") {
      const stops = await shell.match("/stops");
      if (stops && !stops.redirected) return stops;
    }

    return offlinePage();
  }
}

// Max in-flight requests while precaching. The bottleneck is latency × N, so a
// small pool cuts wall time without hammering the server or the connection.
const PRECACHE_CONCURRENCY = 6;

/** Precache every trip route (HTML) and uploaded document, posting progress
 *  ({ done, total, bytes } / { finished, bytes } / { error }) over `port`.
 *  Downloads run through a fixed-size worker pool so N requests overlap. */
async function precacheTrip(routes, docs, port) {
  const tripCache = await caches.open(TRIP_CACHE);
  const docsCache = await caches.open(DOCS_CACHE);
  const jobs = [
    ...routes.map((url) => ({ cache: tripCache, url })),
    ...docs.map((url) => ({ cache: docsCache, url })),
  ];
  const total = jobs.length;
  let done = 0;
  let bytes = 0;

  const report = () => port?.postMessage({ done, total, bytes });

  async function warm({ cache, url }) {
    try {
      const res = await fetch(url, { credentials: "same-origin" });
      if (res.ok && !res.redirected && res.status === 200) {
        const buf = await res.clone().arrayBuffer();
        bytes += buf.byteLength; // single-threaded event loop → += is safe
        await cache.put(url, res);
      }
    } catch {
      // Skip individual failures — a partial download is still useful.
    } finally {
      done += 1;
      report();
    }
  }

  // Worker pool: each worker pulls the next job off a shared cursor until the
  // queue drains, keeping up to PRECACHE_CONCURRENCY requests in flight.
  let cursor = 0;
  async function worker() {
    while (cursor < jobs.length) {
      const job = jobs[cursor++];
      await warm(job);
    }
  }

  try {
    const workers = Math.min(PRECACHE_CONCURRENCY, jobs.length);
    await Promise.all(Array.from({ length: workers }, worker));
    port?.postMessage({ finished: true, done, total, bytes });
  } catch (err) {
    port?.postMessage({ error: String(err) });
  }
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
