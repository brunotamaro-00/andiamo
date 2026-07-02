/** Shared slug normalization — stops and guide content must agree on it
 *  so names like "España" or "Valle del Soča" map to stable URL segments. */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
