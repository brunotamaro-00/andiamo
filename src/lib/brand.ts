/**
 * Copy y URLs de la marca Andiamo — fuente única para metadata.
 *
 * Los assets visuales se generan aparte (`npm run brand:build`, ver BRAND.md);
 * esto es solo el texto que consumen `layout.tsx`, `login/page.tsx` y
 * `manifest.ts`, para que el título y el tagline no se dupliquen ni se
 * desincronicen entre la tarjeta del link, la PWA y el login.
 */

/** Nombre de la app. */
export const BRAND_NAME = "Andiamo";

/** Título de la tarjeta del link (Word, WhatsApp, Slack). Es lo que ve un
 *  crawler: `/` redirige a `/login`, así que el título "público" sale de ahí. */
export const BRAND_TITLE = "Andiamo · Guía de viaje";

/** Bajada de marca. Va en `og:description` (el renglón de texto de la tarjeta),
 *  en la description del manifest y bajo el wordmark en el login. */
export const BRAND_TAGLINE = "Todo el viaje, en el bolsillo · Europa 2026";

/** Preview social 1200×630 (`public/brand/og-image.png`). */
export const BRAND_OG_IMAGE = "/brand/og-image.png";

/**
 * Base absoluta para las URLs de metadata. Sin esto, Next emite `og:image`
 * relativo y varios crawlers (Office incluido) lo descartan.
 */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://andiamo.lat";
