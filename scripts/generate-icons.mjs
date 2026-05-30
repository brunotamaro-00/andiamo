/**
 * PWA icon generator — Andiamo brand mark.
 *
 * Renders the Andiamo map-pin symbol on a warm off-white canvas:
 *   • Background: canvas #FAF9F7
 *   • Pin body:   coral  #FF385C (solid fill, teardrop shape)
 *   • Inner dot:  #FFF0F3 (off-white, matches coral-bg)
 *
 * Dependency-free; encodes PNG using only Node's built-in `zlib`.
 * Run with: `node scripts/generate-icons.mjs`
 *
 * Outputs (full-bleed, suitable for `purpose: "any maskable"`):
 *   public/icon-192.png
 *   public/icon-512.png
 *   public/apple-icon.png   (180×180)
 */
import { deflateSync, crc32 } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(__dirname, "..", "public");

/* ── Palette (matches globals.css @theme tokens) ─────────────────── */
const BG   = [0xfa, 0xf9, 0xf7]; // canvas #FAF9F7
const PIN  = [0xff, 0x38, 0x5c]; // coral  #FF385C
const DOT  = [0xff, 0xf0, 0xf3]; // coral-bg #FFF0F3

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const lerp  = (a, b, t) => a + (b - a) * t;
const mix   = (c1, c2, t) => [
  lerp(c1[0], c2[0], t),
  lerp(c1[1], c2[1], t),
  lerp(c1[2], c2[2], t),
];

/**
 * Map-pin (teardrop) SDF.
 *
 * Centered at (cx, cy).  The pin has:
 *   - a circular "head" of radius R at the top
 *   - a pointed tail below the center
 *
 * Returns a signed distance-like value > 0 inside the shape.
 */
function pinSDF(x, y, cx, cy, R) {
  // Head centre lives R*0.1 above the geometric centre so the tail has room.
  const hx = cx;
  const hy = cy - R * 0.15;
  const headR = R * 0.68;

  // Tail: a downward triangle whose tip is at (cx, cy + R).
  // We use a soft union of the head circle and the triangle.
  const dHead = Math.hypot(x - hx, y - hy) - headR;

  // Triangle SDF (approximate): the tail widens from the tip upward.
  const ty = cy + R; // tip y
  const progress = clamp((ty - y) / (R * 1.0), 0, 1); // 0 at tip, 1 at head
  const halfW = headR * progress;
  const dTailX = Math.abs(x - cx) - halfW;
  const dTailY = -(ty - y);                            // negative inside
  const dTail  = Math.max(dTailX, dTailY);

  // Smooth min (union)
  const k = headR * 0.3;
  const h = clamp(0.5 + 0.5 * (dTail - dHead) / k, 0, 1);
  return lerp(dTail, dHead, h) - k * h * (1 - h);
}

/** Color of a single device-space sample, returns [r,g,b] 0..255. */
function sample(x, y, S) {
  const cx = S * 0.5;
  const cy = S * 0.48;
  const R  = S * 0.34;

  let col = BG.slice();

  // ── Pin body ───────────────────────────────────────────────────────
  const dPin   = pinSDF(x, y, cx, cy, R);
  const edgePin = clamp(-dPin, 0, 1.5) / 1.5; // anti-alias within 1.5px
  if (edgePin < 1) {
    col = mix(PIN, col, edgePin);
  }

  // ── Inner dot (white circle inside the pin head) ───────────────────
  const dotR  = R * 0.255;
  const dotCy = cy - R * 0.15; // same as head centre
  const dDot  = Math.hypot(x - cx, y - dotCy) - dotR;
  const edgeDot = clamp(-dDot, 0, 1.5) / 1.5;
  if (edgeDot < 1) {
    col = mix(DOT, col, edgeDot);
  }

  return col.map(Math.round);
}

/** Render an RGBA buffer with SSx supersampling for clean anti-aliasing. */
function render(size, ss = 3) {
  const S   = size * ss;
  const out = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0;
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const c = sample(x * ss + sx + 0.5, y * ss + sy + 0.5, S);
          r += c[0]; g += c[1]; b += c[2];
        }
      }
      const n = ss * ss;
      const i = (y * size + x) * 4;
      out[i]     = Math.round(r / n);
      out[i + 1] = Math.round(g / n);
      out[i + 2] = Math.round(b / n);
      out[i + 3] = 255;
    }
  }
  return out;
}

/* ── Minimal PNG encoder (RGBA, 8-bit, filter 0) ───────────────────── */
function chunk(type, data) {
  const len     = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const body    = Buffer.concat([typeBuf, data]);
  const crc     = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body) >>> 0, 0);
  return Buffer.concat([len, body, crc]);
}

function encodePng(rgba, size) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8]  = 8; // bit depth
  ihdr[9]  = 6; // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // Prepend filter byte (0) to each scanline.
  const stride = size * 4;
  const raw    = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }

  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

mkdirSync(PUBLIC, { recursive: true });
for (const [name, size] of [
  ["icon-192.png",   192],
  ["icon-512.png",   512],
  ["apple-icon.png", 180],
]) {
  const png = encodePng(render(size), size);
  writeFileSync(join(PUBLIC, name), png);
  console.log(`wrote public/${name} (${png.length} bytes)`);
}
