<!-- BEGIN:nextjs-agent-rules -->
# Agent Guide — Andiamo Trip App

## What this app is

Personal PWA travel guide for a 26-stop Europe trip (2026) — branded **Andiamo**. Features: stop list + detail pages, POI management, notes, document storage, live weather/currency widgets. Single-user, password-protected.

## Stack — version-specific gotchas

| Library | Version | Gotcha |
|---|---|---|
| Next.js | 16.2.6 | App Router only. Read `node_modules/next/dist/docs/` before changes. |
| React | 19.2.4 | Server Components by default. Add `"use client"` only when you need interactivity. |
| Tailwind CSS | 4.x | Config lives in `src/app/globals.css` under `@theme {}`. There is no `tailwind.config.js` — do not create one. |
| Prisma | 7.x | Client is generated at `src/generated/prisma/client`. Import as `@/generated/prisma/client`, not `@prisma/client`. |
| Prisma adapter | 7.x | Uses `PrismaPg` driver adapter — always instantiate with it (see `src/lib/db.ts`). |

## Auth

Custom HMAC cookie auth. Logic in `src/lib/session.ts`. Edge enforcement lives in `src/proxy.ts` (Next.js 16's middleware convention — the file is named `proxy.ts` and exports a `proxy` function). Its matcher excludes `api/documents`, so those routes validate the cookie themselves. As defense-in-depth, Server Actions and auth-gated pages also call `requireAuth()` from `@/lib/session`. Password is `APP_PASSWORD` env var.

## Architecture patterns

- **Mutations** → Server Actions in `src/app/actions/` (marked `"use server"`)
- **External data** → API routes in `src/app/api/` (geocode, weather, exchange rates, document upload/download)
- **DB access** → import `db` from `@/lib/db` (Prisma singleton, never instantiate directly)
- **Revalidation** → Server Actions call `revalidatePath()` — no client state library

## Design system

**Andiamo** uses a warm cream light theme inspired by Botardo's design language — OKLCH palette, bottom-heavy shadows, uppercase labels, stagger animations. Tokens live in `src/app/globals.css` under `@theme {}`. Do NOT use arbitrary Tailwind values for colors.

### Color tokens (OKLCH warm harmony)

| Token | Role |
|---|---|
| `canvas` | Page background — warm cream `oklch(0.963 0.022 88)` |
| `surface` | Cards — near-white `oklch(0.990 0.012 88)` |
| `surface-2` | Inputs / muted / nested elements `oklch(0.938 0.016 88)` |
| `border` | Default border `oklch(0.868 0.022 88)` |
| `border-strong` | Hover/active border |
| `ink` | Primary text — warm near-black |
| `ink-2` | Secondary text |
| `ink-3` | Muted / labels |
| `ink-faint` | Placeholder / disabled |
| `coral` | `#FF385C` — CTA / accent |
| `coral-hover` / `coral-press` | Hover / press states |
| `coral-ink` | Coral text on light bg |
| `coral-border` / `coral-bg` | Accent border / surface |
| `success` / `success-bg` | Success states |
| `warning` / `warning-bg` | Warning states |
| `danger` / `danger-bg` | Error / destructive |
| `special` / `special-bg` | Candidate / special states |

### Elevation (Botardo bottom-heavy style)

- `card-shadow` — `0 12px 28px -24px rgb(0 0 0 / 0.18), 0 1px 0 0 rgb(0 0 0 / 0.04)` — use on all cards
- `card-shadow-lg` — heavier version for modals/overlays
- `card-hover` — adds `transition + translateY(-2px)` on hover (use on interactive cards)
- Aliases: `shadow-soft` = `card-shadow`, `shadow-soft-lg` = `card-shadow-lg`

### Animations

- `animate-fade-in` — `fadeIn 400ms ease-out both` (Y 8px → 0, opacity 0→1)
- `animate-slide-up` — `slideUp 400ms ease-out both` (Y 16px → 0)
- `stagger-1` … `stagger-6` — animation-delay 60ms…360ms for list items
- `animate-pulse-skeleton` — for skeleton loaders

### Fonts

- `font-display` → **Montserrat** (400/500/600/700) — all headings, wordmark, stat numbers, body
- `font-sans` → **Inter** — body copy fallback
- Body uses `font-display` (Montserrat) globally
- `font-tabular` — tabular nums for data values

### Label convention (critical)

All section labels, headers, and metadata use:
```
text-[11px] font-semibold uppercase tracking-widest text-ink-3
```

### Wordmark

`<Wordmark size="sm" | "lg" />` — coral SVG map-pin + "Andiamo" in Montserrat Bold. Required in every page header.

### Style conventions

- Cards: `rounded-xl` + `card-shadow` (NOT `shadow-soft` for new code)
- Modals: `rounded-2xl` + `card-shadow-lg`
- Buttons primary: `rounded-full` (pill) — CTA style
- Buttons secondary/ghost: `rounded-full`
- Inputs: `rounded-lg` — slightly tighter
- Transitions: `duration-150` (faster than old `duration-200`)
- Focus rings: `ring-coral/40` (coral at 40% opacity, softer)
- Active TabBar: coral pill bg (`bg-coral-bg`) behind icon
<!-- END:nextjs-agent-rules -->
