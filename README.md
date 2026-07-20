# Europa 2026 — Trip Guide

Personal PWA travel guide for a 26-stop Europe trip. Designed to run as a home-screen app on mobile.

## Features

- Stop list with weather widget and currency info
- POI management per stop (hostels, museums, food, transport…)
- Notes and document storage per stop (and globally)
- Login by picking Bruno or Katia (no password); session cookie lasts 90 days

## Tech stack

- Next.js 16 (App Router, standalone output)
- React 19 + TypeScript
- Tailwind CSS 4
- Prisma 7 + PostgreSQL via `pg` driver adapter

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SESSION_SECRET` | Yes | Secret for HMAC session token signing |

## Local setup

```bash
cp .env.example .env   # fill in DATABASE_URL + SESSION_SECRET
npm install
npm run db:migrate     # run Prisma migrations
npm run db:seed        # seed the 26 stops
npm run dev            # http://localhost:3000
```

## Project structure

```
src/
  app/
    actions/     # Server Actions — all mutations go here
    api/         # API routes (geocode, weather, rates, documents)
    stops/       # Stop list page + [slug] detail page
    general/     # Global notes and documents page
    login/       # Auth page
  components/    # Feature components (panels, cards)
  components/ui/ # Primitive UI (Button, Card, Modal, Field, Badge…)
  lib/           # db singleton, session utils, helpers
prisma/
  schema.prisma  # Models: Stop, Poi, Note, Document, Setting
  seed.ts        # Seeds the 26 trip stops
```
