/**
 * Outcome of a finished PRECACHE_TRIP report from the service worker.
 *
 * The SW counts two kinds of miss apart on purpose:
 *   - `gone`  — a document 4xx (R2 object deleted, DB row left behind). Permanent;
 *               retrying will not bring it back. The rest of the trip is still
 *               usable offline, so the client must save its localStorage meta.
 *   - `failed` — quota, timeout, network. A retry after freeing space or getting
 *               signal can fix it. Treat as a real failure: do not write meta.
 *
 * Lumping `gone` into `failed` made one orphaned row reject every download
 * forever, with 200 of 201 files correctly cached and the card still offering
 * "Descargar viaje".
 */
export type PrecacheOutcome =
  | { status: "ok"; gone: number; bytes: number }
  | { status: "fatal"; failed: number; total: number };

export function precacheOutcome(report: {
  failed?: number;
  gone?: number;
  total?: number;
  bytes?: number;
}): PrecacheOutcome {
  const failed = typeof report.failed === "number" ? report.failed : 0;
  const gone = typeof report.gone === "number" ? report.gone : 0;
  const total = typeof report.total === "number" ? report.total : 0;
  const bytes = typeof report.bytes === "number" ? report.bytes : 0;
  if (failed > 0) return { status: "fatal", failed, total };
  return { status: "ok", gone, bytes };
}
