/** Demo mode: the public showcase deploy (demo.andiamo.lat).
 *
 *  Same repo and branch as production — only the Railway env vars differ, so a
 *  demo-only branch can never drift. The flag is `NEXT_PUBLIC_` because client
 *  components read it too (`DocumentsPanel` hides file upload), and Next inlines
 *  it at build time on both sides.
 *
 *  What demo mode changes:
 *  - a persistent banner marking the data as fictional (`DemoBanner`)
 *  - no file uploads: the demo service has no R2 credentials, so a POST to
 *    /api/documents/upload would 500. Adding documents by link still works.
 *
 *  Everything else stays writable on purpose — a visitor should be able to feel
 *  the product. A nightly cron re-seeds the demo database.
 */
export const IS_DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === "1";
