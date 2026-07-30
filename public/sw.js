// Andiamo Service Worker v6
// Strategy summary:
//   /api/documents/*  GET  → cache-first (offline-capable document files)
//   Navigation             → network-first (fresh data online, cached shell offline)
//   /_next/static/         → stale-while-revalidate (immutable build assets)
//   Everything else        → network-only (auth-gated API routes, RSC payloads)
// Weather/rates arrive server-rendered inside the page HTML.
//
// "Descargar viaje" (PRECACHE_TRIP message) warms the trip cache with every
// stop/guide page HTML + uploaded document, so airplane mode stays readable.

// Bump CACHE_VERSION on every deploy that changes the shell or adds a route.
// SHELL_CACHE and TRIP_CACHE are versioned *together* on purpose: cached page HTML
// references /_next/static/<buildId>/ chunks that live in SHELL_CACHE, so evicting
// the chunks while keeping the HTML would serve unhydratable pages offline. The
// cost is that "Descargar viaje" must be re-run after a deploy — correct, since the
// old HTML is unusable anyway.
// v14: rebranding — offline.html pasó a llevar el logo SVG inline.
// Los assets de public/brand/* NO se precachean a propósito: la app dibuja la
// marca con SVG inline (src/components/Brand.tsx) y esos PNG son solo para
// crawlers y para el sistema operativo, que no pasan por el service worker.
const CACHE_VERSION = "v15";
const SHELL_CACHE = `andiamo-shell-${CACHE_VERSION}`;
const TRIP_CACHE  = `andiamo-trip-${CACHE_VERSION}`;  // on-demand precache of stop/guide route HTML
// Document files are addressed by immutable id and don't depend on the build.
const DOCS_CACHE  = "andiamo-docs-v1";
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

/** Precache the shell, skipping anything the server redirected.
 *
 *  All SHELL_ROUTES except /offline.html are auth-gated, and the SW registers from
 *  the root layout — which also renders /login. Installing while logged out made
 *  every route redirect to /login, and `cache.addAll` follows redirects: the login
 *  HTML got stored under the "/stops" key. Those entries are `redirected: true`, so
 *  every `!cached.redirected` check below discards them and the shell stayed
 *  permanently poisoned. Caching only clean 200s leaves the entry missing instead,
 *  and networkFirstNavigate re-warms it on the first authenticated visit. */
async function precacheShell() {
  const cache = await caches.open(SHELL_CACHE);
  await Promise.all(
    SHELL_ROUTES.map(async (url) => {
      try {
        const res = await fetch(url, { credentials: "same-origin" });
        if (res.ok && !res.redirected) await cache.put(url, res);
      } catch {
        // Offline at install time — the route re-warms on the next online visit.
      }
    })
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(precacheShell().then(() => self.skipWaiting()));
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

  // Only GET is cacheable. `request.mode === "navigate"` is also true for plain
  // <form action={serverAction}> submits (login, add note, edit doc) when they
  // degrade to a POST navigation — passing those to cache.put() throws
  // "Request method POST is unsupported". Let the network handle them.
  if (request.method !== "GET") return;

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
      // Heal the shell: if install ran logged out, this route is missing from
      // SHELL_CACHE (see precacheShell). An authenticated visit restores it.
      if (SHELL_ROUTES.includes(url.pathname)) {
        shell.put(url.pathname, response.clone());
      }
    }
    return response;
  } catch {
    // Offline: serve the cached copy of this exact route if we have one.
    const cached = (await trip.match(request)) ?? (await shell.match(request));
    if (cached && !cached.redirected) return cached;

    // "/" and "/hoy" redirect server-side and can't be cached — offline, fall
    // back to the itinerary as the entry point. Check TRIP_CACHE first: that's
    // where fresh navigations and "Descargar viaje" store /stops, so looking
    // only at SHELL_CACHE sent users to the offline page with the whole trip
    // sitting in cache. `start_url` is "/", so this is the PWA's cold start.
    if (url.pathname === "/" || url.pathname === "/hoy") {
      const stops = (await trip.match("/stops")) ?? (await shell.match("/stops"));
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
