import "dotenv/config";
import { runDummySeed } from "./seed-dummy";

/**
 * seed-dev.ts — datos ficticios para navegar/testear en local.
 *
 * Todo el contenido lo genera `seed-dummy.ts`; acá solo se elige a dónde
 * apuntan los documentos. En local no hay nada que abrir: alcanza con que la
 * fila exista.
 *
 * DESTRUCTIVO: borra todas las notas y documentos y los regenera. Las paradas
 * se upsertean (los slugs se preservan). Correr `npm run db:seed` para volver
 * al dataset de producción.
 */
runDummySeed({ docUrl: "https://example.com/andiamo-dummy" });
