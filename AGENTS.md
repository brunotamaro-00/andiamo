<!-- BEGIN:nextjs-agent-rules -->
# Agent Guide — Europa 2026 Trip App

## What this app is

Personal PWA travel guide for a 26-stop Europe trip (2026). Features: stop list + detail pages, POI management, notes, document storage, live weather/currency widgets. Single-user, password-protected.

## Stack — version-specific gotchas

| Library | Version | Gotcha |
|---|---|---|
| Next.js | 16.2.6 | App Router only. Read `node_modules/next/dist/docs/` before changes. |
| React | 19.2.4 | Server Components by default. Add `"use client"` only when you need interactivity. |
| Tailwind CSS | 4.x | Config lives in `src/app/globals.css` under `@theme {}`. There is no `tailwind.config.js` — do not create one. |
| Prisma | 7.x | Client is generated at `src/generated/prisma/client`. Import as `@/generated/prisma/client`, not `@prisma/client`. |
| Prisma adapter | 7.x | Uses `PrismaPg` driver adapter — always instantiate with it (see `src/lib/db.ts`). |

## Auth

Custom HMAC cookie auth. No middleware. Logic in `src/lib/session.ts`. Server Actions and pages that require auth read the cookie (`trip_session`) and validate it manually. Password is `APP_PASSWORD` env var.

## Architecture patterns

- **Mutations** → Server Actions in `src/app/actions/` (marked `"use server"`)
- **External data** → API routes in `src/app/api/` (geocode, weather, exchange rates, document upload/download)
- **DB access** → import `db` from `@/lib/db` (Prisma singleton, never instantiate directly)
- **Revalidation** → Server Actions call `revalidatePath()` — no client state library

## Design system

Custom color palette and fonts are declared in `src/app/globals.css` under `@theme {}`. Do not use arbitrary Tailwind values for colors — use the tokens:

- **Neutrals:** `sand-950` → `sand-100` (dark canvas to light text)
- **Accent:** `gold-300` → `gold-900`
- **Semantic:** `success`, `success-bg`, `warning`, `warning-bg`, `danger`, `danger-bg`, `special`, `special-bg`
- **Fonts:** `font-sans` (Inter), `font-display` (Fraunces)
<!-- END:nextjs-agent-rules -->
