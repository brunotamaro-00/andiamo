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
| `coral` | `#E8462B` — brick red CTA / accent |
| `coral-hover` / `coral-press` | Hover / press states |
| `coral-ink` | Brick red text on light bg `#8B2010` |
| `coral-border` / `coral-bg` | Accent border / surface |
| `gold` | `#C8A24B` — Panini gold accent |
| `gold-bg` / `gold-ink` / `gold-border` | Gold surface / text / border |
| `success` / `success-bg` | Success / pitch green `#2F7D4F` |
| `warning` / `warning-bg` | Warning states |
| `danger` / `danger-bg` | Error / destructive |
| `special` / `special-bg` | Candidate / special states |

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

`<Wordmark size="sm" | "lg" />` — brick-red SVG map-pin + "ANDIAMO" in Anton uppercase. Required in every page header.

### Style conventions

- Cards: `rounded-[4px]` + `border-2 border-border` + `card-shadow`
- Modals: `rounded-[6px]` + `border-2 border-border` + `card-shadow-lg`
- Buttons primary: `rounded-[2px]` + `hard-shadow-ink` + `font-display uppercase` — sticker CTA style
- Buttons secondary/ghost: `rounded-full` + `border-2 border-ink`
- Inputs: `rounded-xl` — keep rounded for usability
- Transitions: `duration-150`
- Focus rings: `ring-coral/40`
- TabBar: `border-t-2 border-ink` top rule; active label uppercase extrabold brick red
<!-- END:nextjs-agent-rules -->
