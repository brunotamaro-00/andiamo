<!-- BEGIN:nextjs-agent-rules -->
# Agent Guide — Andiamo Trip App

## What this app is

Personal PWA travel guide for a ~30-stop Europe trip (Aug–Nov 2026) — branded **Andiamo**. Private couple app: `/login` is a Bruno/Katia picker (no password). Main routes (5-tab TabBar):

- `/hoy` — **not a dashboard**: it resolves the current stop (per viewer + today's date via `computeCurrentStopSlug`) and redirects to `/stops/[slug]`. `/` redirects here. The old phase-aware dashboard was removed deliberately — don't reintroduce it without asking.
- `/stops` — itinerary timeline with stats, TodayCard, add/edit/reorder stops; `/stops/[slug]` detail: notes, documents, currency, guide links.
- `/guias` — markdown guides synced from `~/Desktop/Trip/Itinerary` via `npm run guides:sync` (SSG, no cookies).
- `/search` — cross-entity search (stops, notes, documents, guides).
- `/general` — trip-wide notes and documents (`stopId: null`).

## Stack — version-specific gotchas

| Library | Version | Gotcha |
|---|---|---|
| Next.js | 16.2.6 | App Router only. Read `node_modules/next/dist/docs/` before changes. |
| React | 19.2.4 | Server Components by default. Add `"use client"` only when you need interactivity. |
| Tailwind CSS | 4.x | Config lives in `src/app/globals.css` under `@theme {}`. There is no `tailwind.config.js` — do not create one. |
| Prisma | 7.x | Client is generated at `src/generated/prisma/client`. Import as `@/generated/prisma/client`, not `@prisma/client`. |
| Prisma adapter | 7.x | Uses `PrismaPg` driver adapter — always instantiate with it (see `src/lib/db.ts`). |

## Auth

Custom HMAC cookie auth. Logic in `src/lib/session.ts`. Edge enforcement lives in `src/proxy.ts` (Next.js 16's middleware convention — the file is named `proxy.ts` and exports a `proxy` function). Its matcher excludes `api/documents`, `api/stops`, `api/notes`, `api/guides` and `api/integration`: the first validates the session cookie itself, the rest authenticate with `X-Api-Key` via `isValidApiKey()` (`lib/session.ts`, constant-time, fails closed when the env var is unset). `/api/*` requests with an invalid session get a **401 JSON** response (never a redirect — clients `fetch` these). As defense-in-depth, Server Actions and auth-gated pages also call `requireAuth()` from `@/lib/auth`. Login sets `trip_session` (90 days) + `trip_person` when the user taps Bruno or Katia — no password.

## Architecture patterns

- **Mutations** → Server Actions in `src/app/actions/` (marked `"use server"`). Validate FormData with the Zod schemas in `_schemas.ts` (`parseForm` never throws; nights must be within `[0, MAX_NIGHTS]` — an unbounded value reaches `addDaysStr` and throws `RangeError`, poisoning every later itinerary recalc — dates `YYYY-MM-DD`, coords required and range-checked — tested in `_schemas.test.ts`).
- **Action errors** → actions return `{ error: string }` instead of throwing for expected failures (validation, missing records). Catch Prisma P2025/P2003 with `isRecordMissing()` from `@/lib/db`; deletes treat "already gone" as success. Clients MUST check the resolved value — `useOptimisticList` (`mutate`/`run`) already reverts and shows the error banner when a resolved `{ error }` comes back.
- **Spitwise integration** (formerly codenamed "Botardo") → `src/lib/spitwise.ts`; env `SPITWISE_URL` (legacy fallback: `BOTARDO_URL`) + `TRIP_SHARED_API_KEY`. Andiamo is the source of truth for stops: `GET /api/stops` (X-Api-Key) feeds Spitwise's cache, and every stop mutation in `src/app/actions/stops.ts` fires `after(() => notifyStopsChanged())` so Spitwise re-pulls instantly (its 6h lazy pull is the fallback — the ping must never block or fail a stop edit). Spend data flows back via `fetchStopSpendDetail`, rendered by `StopSpendPanel` on stop detail — it degrades to nothing when Spitwise is down.
- **Guías: región → ciudad → docs** → El manifest (`content/guides/manifest.json`, generado por `scripts/sync-guides.ts`) tiene tres niveles: país → guía → *ciudad*. Una guía normal (Roma, París) es una ciudad y tiene `cities: []`. En el **Sur de Italia** la guía es la **región** (`sicilia`, `puglia`, `calabria`, `costa-amalfitana`) porque la ruta de noviembre todavía es tentativa: los docs de región (`transporte`, `gastronomia`, `contexto_historico`) viven en la raíz de la guía y cada ciudad (Palermo, Bari, Sorrento…) es un `GuideCity` anidado con sus propios docs y `Day_trips/`. **Las ciudades no tienen ruta propia** — comparten el namespace `/guias/[guide]/[doc]`, así que sus slugs se prefijan con la ciudad (`palermo-transporte` vs el regional `transporte`); el sync valida la unicidad y omite carpetas de ciudad vacías. `sur-de-italia` sigue siendo la guía de **decisión** (README + opciones), sin ciudades; Nápoles queda fuera del contenedor y conserva `costa-amalfitana` como guía secundaria. Recorré siempre todos los docs con `guideDocs(guide)` (`guide-types.ts`) — usar `guide.docs`/`guide.dayTrips` a secas se saltea las ciudades (rompe `generateStaticParams`, el precache offline y el export a Spitwise). `STOP_TO_GUIDES` mapea stops → guía regional; `STOP_TO_GUIDE_CITY` afina qué grupo de ciudad muestra la `GuideCard` de un stop-ciudad (bari→bari). Solo poné slugs de stops **reales** en esos mapas: `stopSlugsForGuide` los renderiza como links `/stops/[slug]`.
- **Vista por persona (solo gastos)** → `src/lib/person.ts` (constantes puras, importable desde el cliente) + `src/lib/person-server.ts` (`getPerson()`, lee la cookie `trip_person`). Se elige en el login (Bruno/Katia) y se puede cambiar con `PersonSwitcher` (slot `actions` de `PageHeader` en `/stops/[slug]`). Se pasa a Spitwise como `?user=` y este devuelve el `user_share`: mitad de un gasto compartido, entero de uno propio, y los privados del otro no se envían. `null` = "Ambos" (totales gross del hogar, comportamiento previo y fallback de sesiones viejas). Es una preferencia de vista y aplica a gastos — notas, documentos y guías son idénticos para los dos. **Única excepción:** los stops se filtran por persona vía `stopVisibleTo(stop, viewer)` (`person.ts`) según `Stop.ownerPerson` (`null` = compartido). Es el swap "Pititas": mientras Bruno está en Portugal (`lisboa`/`porto` con `ownerPerson='bruno'`), Katia ve la pseudo-ciudad `pititas` (`ownerPerson='katia'`, `isLocal=true`) en su lugar; "Ambos" ve todo. **No es un límite de seguridad**: `PersonSwitcher` permite pasar a "Ambos" sin fricción, ambas personas comparten el mismo token de sesión y las mutaciones no chequean `stopVisibleTo`. El `notFound()` por persona en `/stops/[slug]` mantiene la URL coherente con la lista, no oculta datos. Un stop `isLocal` no tiene bandera/sol/clima/moneda, se excluye de `/api/stops` (sync a Spitwise) y de `recalculateItinerary` (corre en paralelo a la secuencia, no la desplaza). No leas la cookie desde `PageHeader` ni desde `/guias`: son SSG y `cookies()` los volvería dinámicos. Stop slugs are immutable (set once at creation) — they are the join key for expenses; never add slug editing without treating it as delete + create.
- **External data** → API routes in `src/app/api/` (geocode, document upload/download). External fetches (`geocode.ts`, `rates.ts`, `temp-range.ts`) degrade gracefully (`[]`/`null`/DB fallback) — never let a third-party failure 500 a page. Never persist an empty payload over a good cached fallback (see `rates.ts`).
- **DB access** → import `db` from `@/lib/db` (Prisma singleton, never instantiate directly)
- **Revalidation** → Server Actions call `revalidatePath()` — no client state library. Mutations affecting notes/documents must also revalidate `"/search"` (it indexes note and document text). `setPerson` revalidates `/stops`, `/stops/[slug]` and `/search`, because person swaps which stops are visible. Revalidating `"/hoy"` is pointless — it only redirects.
- **Service worker** → `public/sw.js`. Navigation is **network-first** (`networkFirstNavigate`): online you always get fresh HTML (pages are `force-dynamic`); the fresh copy is cached in `TRIP_CACHE` for offline. Offline, App Router soft-nav RSC fetches fail and Next falls back to a hard navigation, served from cache; `/` and `/hoy` redirect (uncacheable) so offline they fall back to the cached `/stops`. Shell routes (`/stops`, `/guias`, `/general`, `/search`, `/offline.html`) are precached on install — adding a top-level route = add it to `SHELL_ROUTES` and bump `CACHE_VERSION`. **Never precache with `cache.addAll`**: those routes are auth-gated and the SW can install pre-login, so `addAll` follows the redirect and stores the login HTML under the real key. `precacheShell()` caches only non-redirected 200s, and `networkFirstNavigate` re-warms a missing shell route on the first authenticated visit. Only GET reaches the cache — a `<form action={serverAction}>` submit is also `mode: "navigate"` and `cache.put` throws on POST. **"Descargar viaje"** (`DownloadTripButton` in `/general`) fetches `/api/offline/manifest` (all stop/guide routes + uploaded document ids) and posts `PRECACHE_TRIP` to the SW, which warms `TRIP_CACHE` (route HTML) and `DOCS_CACHE` (files), reporting progress over a `MessageChannel`. Offline = read-only (no mutation queue). Caches: `SHELL_CACHE`/`TRIP_CACHE`/`DOCS_CACHE`, all in `KNOWN_CACHES`; logout still wipes everything via `CLEAR_ALL_CACHES`. `SHELL_CACHE` and `TRIP_CACHE` share `CACHE_VERSION` and must stay versioned together — cached HTML in `TRIP_CACHE` references `/_next/static` chunks living in `SHELL_CACHE`, so bumping one alone yields unhydratable offline pages. `DOCS_CACHE` is versioned separately (documents are keyed by immutable id).
- **Date logic** → always compare `YYYY-MM-DD` strings via helpers in `@/lib/trip` (`todayStr()` anchored to Europe/Madrid); `toLocaleDateString` always with `timeZone: "UTC"`. "Current stop" (`computeCurrentStopSlug`) falls back to first/last stop outside its date range — verify today is inside `[arrival, departure)` before claiming "estás en X".

## Local dev

DB runs in Docker: `open -a Docker && docker start trip-postgres` (postgres:17, db `tripguide`) before `npm run dev`. Prisma `ECONNREFUSED` means the container is down, not a code bug.

**Pruebas visuales / browser (MCP Playwright o Claude in Chrome):** siempre con viewport **iPhone 17** — `402×874` CSS px, `deviceScaleFactor: 3`, mobile UA. No probar el frontend en desktop por defecto.

**Seeds:** `npm run db:seed` loads the real itinerary (Aug–Nov 2026 dates, real notes). `npm run db:seed:dev` (`prisma/seed-dev.ts`) loads **dummy data for local testing**: it reuses the exported `STOPS` from `seed.ts` but rebases every date around *today* so the trip appears at its midpoint — this is what makes a stop actually "current", exercising the in-stay UI (countdown, weather/sun, `/hoy` resolving to a real stop). It also **wipes and regenerates** notes/documents with itinerary-aligned placeholders (Auschwitz, zakaz handlu, monedas, vouchers por parada; `source:"link"`, no R2). Destructive to child tables — re-run `db:seed` to restore production data. `npm run db:seed:demo` (`prisma/seed-demo.ts`) es el mismo dataset para el deploy público: reusa `seedDummyData` de `seed-dev.ts` y solo cambia a dónde apuntan los documentos (un PDF real en `public/demo/` en vez de example.com). Lo corre el cron nocturno de Railway.

**Demo pública (`demo.andiamo.lat`):** mismo repo y rama que prod, gobernada por `NEXT_PUBLIC_DEMO_MODE=1` → `IS_DEMO` (`src/lib/demo.ts`). Cambia dos cosas: `DemoBanner` en el layout y, en `DocumentsPanel`, se cae la subida de archivos porque ese servicio no tiene credenciales R2 (el `POST /api/documents/upload` también responde 403). Runbook completo — variables, aislamiento de la key compartida, cron de reset — en `../spitwise/DEPLOY.md`, sección *Demo pública*.

## Design system

**Andiamo** uses a warm cream light theme inspired by the **Panini editorial aesthetic** (7a0.com.br) — hex palette, hard sticker shadows, Anton display type, uppercase labels, stagger animations. Tokens live in `src/app/globals.css` under `@theme {}`. Do NOT use arbitrary Tailwind values for colors.

### Color tokens (Panini warm paper)

| Token | Role |
|---|---|
| `canvas` | Page background — warm cream `#F3ECD8` |
| `surface` | Cards — white `#FFFFFF` |
| `surface-2` | Inputs / muted / nested elements `#EAE2CB` |
| `border` | Default border / rule `#D8CFB4` |
| `border-strong` | Hover/active border `#C2B08A` |
| `ink` | Primary text — warm near-black `#1B1A17` |
| `ink-2` | Secondary text `#6B6452` |
| `ink-3` | Muted / labels `#8A7F6A` |
| `ink-faint` | Placeholder / disabled `#ABA090` |
| `brick` | `#C44428` — ladrillo CTA / accent (was `coral`) |
| `brick-hover` / `brick-press` | Hover / press states |
| `brick-ink` | Ladrillo text on light bg `#832C18` |
| `brick-border` / `brick-bg` | Accent border `#EAAD9C` / surface `#FAE8E3` |
| `gold` | `#C8A24B` — Panini gold accent |
| `gold-bg` / `gold-ink` / `gold-border` | Gold surface / text / border |
| `success` / `success-bg` | Success / pitch green `#2F7D4F` |
| `warning` / `warning-bg` | Warning states |
| `danger` / `danger-bg` | Error / destructive |
| `special` / `special-bg` | Candidate / special states `#7C3AED` |

### Elevation (sobered sticker style: small hard offset + warm diffuse)

- `card-shadow` — `2px 2px 0 border + 0 4px 14px ink/5%` — use on all cards
- `card-shadow-lg` — `4px 4px 0 ink + 0 10px 28px ink/10%` — modals/overlays
- `hard-shadow-ink` — `2px 2px 0 ink` — CTA buttons
- `hover-shadow-brick` / `hover-shadow-ink` — hover lifts; NEVER inline hex shadows
- `card-hover` — transition for hover states
- Aliases: `shadow-soft` = `card-shadow`, `shadow-soft-lg` = `card-shadow-lg`
- CTA active state: `active:translate-x-[2px] active:translate-y-[2px] active:shadow-none` — sticker press effect

### Animations

- **`motion` (motion/react)** for interactive animation — springs by default, only in `"use client"` components. `MotionConfig reducedMotion="user"` lives in `Providers.tsx` (mounted in `layout.tsx`); pages stay RSC.
- Canonical springs: sheet/Modal `{stiffness:420, damping:38}` · nav/segmented pill `{stiffness:480, damping:36}` · toast `{stiffness:500, damping:32}`
- Page transition = `src/app/template.tsx` (fade + rise 0.22s, ease `[0.22,1,0.36,1]`) — do NOT add `animate-fade-in` at page-container level (double animation); per-card `animate-fade-in` + `stagger-*` is fine
- `animate-fade-in` — `fadeIn 400ms ease-out both` (Y 8px → 0, opacity 0→1)
- `animate-slide-up` — `slideUp 400ms ease-out both` (Y 16px → 0)
- `stagger-1` … `stagger-6` — animation-delay 60ms…360ms for list items
- `animate-pulse-skeleton` + `skeleton-shimmer` — skeleton loaders (Skeleton component has both)
- `prefers-reduced-motion` is handled globally in `globals.css` (entry animations off, smooth scroll off) — new keyframe utilities must be added to that media query; gate hover translates with `motion-reduce:`; motion springs are covered by `MotionConfig reducedMotion="user"` + `useReducedMotion` where imperative

### Feedback (toasts / errors / deletes)

- Success confirmation → `useToast()` from `@/components/ui/Toast` (pill over the TabBar, one at a time). Wire via the optional `onSuccess` callback of `useOptimisticList`'s `mutate`/`run`.
- Expected mutation errors → `MutationErrorBanner` (inline, persistent) — never a toast.
- Delete policy: individual row (nota/doc) = `InlineDeleteConfirm`; entity with children or expensive data (stop) = `ConfirmDialog` (`@/components/ui/ConfirmDialog`, `busy` locks the sheet).

### Fonts

- `font-display` → **Anton** (400) — headings, wordmark, CTA buttons (always uppercase)
- `font-sans` → **Hanken Grotesk** (400–800) — body copy (default body font)
- `font-numeral` → **Archivo** (900) — large editorial numerals (stats, counts)
- `font-tabular` — tabular nums for inline data values

### Label convention (critical)

All section labels, headers, and metadata use:
```
text-[11px] font-extrabold uppercase tracking-[0.08em] text-ink-3
```

### Marca

Todo vive en `src/components/Brand.tsx` (inline SVG, cero requests, funciona offline sin el SW): `<Wordmark size="sm" | "lg" | "xl" tone>` — mano en brick + "Andiamo" en Anton, uppercase, `tracking-tight`; **obligatorio en el header de cada pantalla**. Además `<Mark>` (la mano sola, pintada con `currentColor`), `<Lockup>` (login/404) y `<BrandDots>` (acento decorativo, tres puntos decrecientes). `tone="dark"` = mano y texto en crema.

Los assets rasterizados (favicon, iconos PWA, `og-image`) **se generan**, no se editan: master en `brand/logo-master.svg` → `npm run brand:build` (`scripts/build-brand.ts`, usa `ImageResponse` de `next/og`, sin deps nuevas) → `public/brand/*`, `public/icon-*`, `src/app/favicon.ico`. Los PNG se commitean. Detalle completo en `BRAND.md`.

Copy de marca (título, tagline, `SITE_URL`, path del og-image) en `src/lib/brand.ts` — no duplicar strings. La tarjeta de link (Word/WhatsApp/Slack) depende de tres cosas frágiles: `metadataBase` en `layout.tsx` (si no, `og:image` sale relativo y los crawlers lo tiran), la metadata repetida en `login/page.tsx` (`/` redirige ahí sin sesión, así que **esa** es la página que ve el crawler) y `"/brand/"` en `PUBLIC_PATHS` de `src/proxy.ts` (si no, la imagen contesta 307 a `/login`).

### Style conventions

- Cards: `rounded-xl` + `border border-border` + `card-shadow`. `border-2` is reserved as signature for: city header card (stop detail), gold TodayCards, selection chips (login/PersonSwitcher) and secondary buttons.
- Modals/sheets: `rounded-t-2xl sm:rounded-2xl` + `border border-border` (Modal component handles it)
- Inner rows / nested boxes: `rounded-lg`
- Buttons primary: `rounded-[6px]` + `hard-shadow-ink` + `font-display uppercase` — sticker CTA style
- Buttons secondary/ghost: `rounded-full` + `border-2 border-ink`
- Inputs: `rounded-xl` — use `Field`/`inputClass`/`Label` from `ui/`, never reimplement inline
- Type floor: **11px** — never `text-[9px]`/`text-[10px]`
- Touch targets: **44px minimum everywhere** (`min-h-[44px]`, `rowActionBtn`, `h-11 w-11`; use negative margins to keep visual density)
- Transitions: `duration-150`
- Focus rings: `ring-brick/40`
- TabBar: `border-t-2 border-ink` top rule; active label uppercase extrabold brick (`text-brick`); active pill = `motion.span layoutId="tab-pill"`
- Fixed bottom overlays: offset with `env(safe-area-inset-bottom)` so they don't cover the TabBar (see `InstallPrompt`)
- `Modal` focuses `[autofocus]` first, then the body's first focusable — put `autoFocus` on the primary input. On mobile it's a bottom sheet with drag-to-dismiss (handle + header zone); `locked` blocks all close paths during mutations.
- `loading.tsx` skeletons must mirror the real layout (use `HeaderSkeleton` + `rounded-xl` cards) — no shape jumps on hydrate
- Segmented choices (2–4 options): `SegmentedControl` from `ui/` instead of adjacent buttons or a select
<!-- END:nextjs-agent-rules -->
