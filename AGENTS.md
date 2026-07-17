<!-- BEGIN:nextjs-agent-rules -->
# Agent Guide — Andiamo Trip App

## What this app is

Personal PWA travel guide for a ~30-stop Europe trip (Aug–Nov 2026) — branded **Andiamo**. Single-user, password-protected. Main routes (5-tab TabBar):

- `/hoy` — "today" dashboard, default landing (`/` redirects here). Phase-aware hero (countdown before the trip / current stop with weather + sun / in-transit / trip summary), pending POIs with optimistic toggle (`TodayPoiList`), current-stop documents, upcoming urgent reservations, next stop.
- `/stops` — itinerary timeline with stats, TodayCard, add/edit/reorder stops; `/stops/[slug]` detail: POIs, notes, documents, currency, guide links.
- `/guias` — markdown guides synced from `~/Desktop/Trip/Itinerary` via `npm run guides:sync` (SSG, no cookies); `/guias/reservas` aggregates "reservas urgentes" sections.
- `/search` — cross-entity search (stops, POIs, notes, documents, guides).
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

Custom HMAC cookie auth. Logic in `src/lib/session.ts`. Edge enforcement lives in `src/proxy.ts` (Next.js 16's middleware convention — the file is named `proxy.ts` and exports a `proxy` function). Its matcher excludes `api/documents`, so those routes validate the cookie themselves. `/api/*` requests with an invalid session get a **401 JSON** response (never a redirect — clients `fetch` these). As defense-in-depth, Server Actions and auth-gated pages also call `requireAuth()` from `@/lib/session`. Password is `APP_PASSWORD` env var, compared constant-time via `secretsMatch()` from `@/lib/session` — never with `!==`.

## Architecture patterns

- **Mutations** → Server Actions in `src/app/actions/` (marked `"use server"`). Validate FormData with the Zod schemas in `_schemas.ts` (`parseForm` never throws; nights must be ≥ 0, dates `YYYY-MM-DD`, coords required and range-checked — tested in `_schemas.test.ts`).
- **Action errors** → actions return `{ error: string }` instead of throwing for expected failures (validation, missing records). Catch Prisma P2025/P2003 with `isRecordMissing()` from `@/lib/db`; deletes treat "already gone" as success. Clients MUST check the resolved value — `useOptimisticList` (`mutate`/`run`) already reverts and shows the error banner when a resolved `{ error }` comes back.
- **Spitwise integration** (formerly codenamed "Botardo") → `src/lib/spitwise.ts`; env `SPITWISE_URL` (legacy fallback: `BOTARDO_URL`) + `TRIP_SHARED_API_KEY`. Andiamo is the source of truth for stops: `GET /api/stops` (X-Api-Key) feeds Spitwise's cache, and every stop mutation in `src/app/actions/stops.ts` fires `after(() => notifyStopsChanged())` so Spitwise re-pulls instantly (its 6h lazy pull is the fallback — the ping must never block or fail a stop edit). Spend data flows back via `fetchStopSpendDetail`/`fetchTripSpend` (rendered by `StopSpendPanel` on stop detail and `TripSpendStrip` on /hoy, both degrade to nothing when Spitwise is down).
- **Vista por persona (solo gastos)** → `src/lib/person.ts` (constantes puras, importable desde el cliente) + `src/lib/person-server.ts` (`getPerson()`, lee la cookie `trip_person`). Se elige en el login y se cambia con `PersonSwitcher` (slot `actions` de `PageHeader` en `/hoy` y `/stops/[slug]`). Se pasa a Spitwise como `?user=` y este devuelve el `user_share`: mitad de un gasto compartido, entero de uno propio, y los privados del otro no se envían. `null` = "Ambos" (totales gross del hogar, comportamiento previo y fallback de sesiones viejas). **No es una barrera de seguridad**: hay un único `APP_PASSWORD` compartido y cualquiera puede cambiar de persona. Es una preferencia de vista y **solo** aplica a gastos — stops, POIs, notas, documentos y guías son idénticos para los dos. No leas la cookie desde `PageHeader` ni desde `/guias`: son SSG y `cookies()` los volvería dinámicos. Stop slugs are immutable (set once at creation) — they are the join key for expenses; never add slug editing without treating it as delete + create.
- **External data** → API routes in `src/app/api/` (geocode, places, document upload/download). External fetches (`geocode.ts`, `places.ts`, `rates.ts`, `temp-range.ts`) degrade gracefully (`[]`/`null`/DB fallback) — never let a third-party failure 500 a page. Never persist an empty payload over a good cached fallback (see `rates.ts`).
- **DB access** → import `db` from `@/lib/db` (Prisma singleton, never instantiate directly)
- **Revalidation** → Server Actions call `revalidatePath()` — no client state library. Mutations affecting stops/POIs/documents must also revalidate `"/hoy"`.
- **Service worker** → `public/sw.js` precaches the shell routes (`/hoy`, `/stops`, `/guias`, `/general`, `/search`). Adding a top-level route = add it to `SHELL_ROUTES` and bump `SHELL_CACHE` version.
- **Date logic** → always compare `YYYY-MM-DD` strings via helpers in `@/lib/trip` (`todayStr()` anchored to Europe/Madrid); `toLocaleDateString` always with `timeZone: "UTC"`. "Current stop" (`computeCurrentStopSlug`) falls back to first/last stop outside its date range — verify today is inside `[arrival, departure)` before claiming "estás en X".

## Local dev

DB runs in Docker: `open -a Docker && docker start trip-postgres` (postgres:17, db `tripguide`) before `npm run dev`. Prisma `ECONNREFUSED` means the container is down, not a code bug.

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

### Elevation (Panini hard sticker style)

- `card-shadow` — `3px 3px 0 #D8CFB4` — use on all cards
- `card-shadow-lg` — `5px 5px 0 #1B1A17` — modals/overlays
- `hard-shadow-ink` — `3px 3px 0 #1B1A17` — CTA buttons
- `card-hover` — transition for hover states
- Aliases: `shadow-soft` = `card-shadow`, `shadow-soft-lg` = `card-shadow-lg`
- CTA active state: `active:translate-x-[3px] active:translate-y-[3px] active:shadow-none` — sticker press effect

### Animations

- `animate-fade-in` — `fadeIn 400ms ease-out both` (Y 8px → 0, opacity 0→1)
- `animate-slide-up` — `slideUp 400ms ease-out both` (Y 16px → 0)
- `stagger-1` … `stagger-6` — animation-delay 60ms…360ms for list items
- `animate-pulse-skeleton` — for skeleton loaders
- `prefers-reduced-motion` is handled globally in `globals.css` (entry animations off, smooth scroll off) — new keyframe utilities must be added to that media query; gate hover translates with `motion-reduce:`

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

### Wordmark

`<Wordmark size="sm" | "lg" />` — inline SVG hand logo in `#C44428` (brick) + "Andiamo" in Anton, `text-ink`, uppercase, scaleY stretched. Required in every page header.

### Style conventions

- Cards: `rounded-[4px]` + `border-2 border-border` + `card-shadow`
- Modals: `rounded-[6px]` + `border-2 border-border` + `card-shadow-lg`
- Buttons primary: `rounded-[2px]` + `hard-shadow-ink` + `font-display uppercase` — sticker CTA style
- Buttons secondary/ghost: `rounded-full` + `border-2 border-ink`
- Inputs: `rounded-xl` — keep rounded for usability
- Transitions: `duration-150`
- Focus rings: `ring-brick/40`
- TabBar: `border-t-2 border-ink` top rule; active label uppercase extrabold brick (`text-brick`)
- Fixed bottom overlays: offset with `env(safe-area-inset-bottom)` so they don't cover the TabBar (see `InstallPrompt`)
- `Modal` focuses `[autofocus]` first, then the body's first focusable — put `autoFocus` on the primary input; touch targets ≥ 44px (`rowActionBtn`, `min-h-[44px]`)
<!-- END:nextjs-agent-rules -->
