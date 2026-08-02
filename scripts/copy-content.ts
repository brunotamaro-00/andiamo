/**
 * Copies content/ into the standalone build output (`next build` only bundles
 * code, and the guide markdown is read from disk at request time).
 *
 * In demo mode it leaves Katia's notes behind. Their routes are already gone —
 * `guides.ts` strips them from the manifest when IS_DEMO, so nothing renders
 * them — but they are personal research and the demo is a public deploy, so
 * they should not sit in its filesystem at all.
 *
 * Usage: tsx scripts/copy-content.ts
 */
import { cpSync, rmSync } from "node:fs";
import path from "node:path";

const IS_DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === "1";
const SOURCE = path.join(process.cwd(), "content");
const DEST = path.join(process.cwd(), ".next", "standalone", "content");

rmSync(DEST, { recursive: true, force: true });
cpSync(SOURCE, DEST, {
  recursive: true,
  filter: (src) => !(IS_DEMO && path.basename(src) === "notas-katia.md"),
});

console.log(
  IS_DEMO
    ? "Copied content/ to standalone (demo: notas-katia.md excluded)."
    : "Copied content/ to standalone."
);
