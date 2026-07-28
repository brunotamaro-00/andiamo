import "dotenv/config";
import { runDummySeed } from "./seed-dev";

/**
 * seed-demo.ts — dataset del deploy público (demo.andiamo.lat).
 *
 * Mismo contenido que `seed-dev.ts` (itinerario rebaseado alrededor de HOY,
 * notas y vouchers ficticios), con una sola diferencia: los documentos apuntan
 * a un PDF real servido por la app, así un visitante que abre un voucher ve
 * algo en vez de aterrizar en example.com.
 *
 * DESTRUCTIVO. Lo corre el cron nocturno de Railway para limpiar lo que hayan
 * dejado los visitantes. Nunca apuntarlo a la DATABASE_URL de producción.
 */

// `/api/documents/[id]` responde un documento `link` con `Response.redirect`,
// que rechaza URLs relativas — de ahí el origen completo.
const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://demo.andiamo.lat").replace(/\/$/, "");

await runDummySeed({ docUrl: `${SITE}/demo/voucher-demo.pdf` });
