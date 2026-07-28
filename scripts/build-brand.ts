/**
 * Genera la librería de marca de Andiamo desde `brand/logo-master.svg`.
 *
 *   npm run brand:build
 *
 * Rasteriza con `ImageResponse` de next/og (satori + resvg, ya viene con Next:
 * cero dependencias nuevas). Los PNG resultantes se commitean — el build de la
 * app no depende de este script.
 *
 * Salidas:
 *   public/brand/*   variantes de marca (mark, tiles, lockups, og-image)
 *   public/*         iconos PWA + apple-touch
 *   src/app/favicon.ico
 *
 * Sin JSX a propósito (`h()` en vez de <div>): el tsconfig de Next usa
 * `jsx: preserve` y tsx/esbuild no lo transforma solo.
 */
import { createElement } from "react";
import type { ReactElement } from "react";
import { ImageResponse } from "next/og";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const MASTER = path.join(ROOT, "brand", "logo-master.svg");
const ANTON = path.join(ROOT, "brand", "fonts", "Anton-Regular.ttf");
const PUB = path.join(ROOT, "public");
const BRAND = path.join(PUB, "brand");

// Tokens de `src/app/globals.css` (@theme). Mantener en sync.
const CREAM = "#F3ECD8"; // canvas
const BRICK = "#C44428";
const INK = "#1B1A17";
const BORDER = "#D8CFB4";

/** Alto/ancho del viewBox del master (330 230 360 520). */
const HAND_RATIO = 360 / 520;
/** Radio del tile redondeado, como fracción del lado (mismo valor que Spitwise). */
const RADIUS_FRAC = 0.225;

const h = createElement;

let masterSvg = "";
let anton: Buffer;

/** El master pintado de un color concreto, como data URI (satori no hereda
 *  `currentColor` dentro de un <img>). */
function handUri(color: string): string {
  const svg = masterSvg.replace(/currentColor/g, color);
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

interface TileOpts {
  /** Fracción del lado que ocupa el alto de la mano. */
  handFrac?: number;
  bg?: string;
  hand?: string;
  /** Tile redondeado (browser) vs cuadrado full-bleed (el SO redondea). */
  rounded?: boolean;
  /** Hairline para que el tile crema se recorte contra fondos blancos. */
  bordered?: boolean;
  transparent?: boolean;
}

function tile(size: number, opts: TileOpts = {}): ReactElement {
  const {
    handFrac = 0.82,
    bg = CREAM,
    hand = BRICK,
    rounded = true,
    bordered = false,
    transparent = false,
  } = opts;
  const handH = Math.round(size * handFrac);
  const handW = Math.round(handH * HAND_RATIO);
  // Ojo: satori rompe con un valor `undefined` en el style ("cannot read
  // properties of undefined (reading 'trim')"), así que la clave se omite.
  const style: Record<string, string | number> = {
    width: size,
    height: size,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: transparent ? "transparent" : bg,
    borderRadius: rounded ? Math.round(size * RADIUS_FRAC) : 0,
  };
  if (bordered) style.border = `${Math.max(1, Math.round(size / 32))}px solid ${BORDER}`;
  return h("div", { style }, h("img", { src: handUri(hand), width: handW, height: handH }));
}

function wordmark(fontSize: number, color = INK): ReactElement {
  return h(
    "div",
    {
      style: {
        display: "flex",
        fontFamily: "Anton",
        fontSize,
        color,
        letterSpacing: "-0.02em",
        lineHeight: 1,
      },
    },
    "ANDIAMO",
  );
}

/** Lockup: tile + wordmark. Sin tagline a propósito — el tagline viaja en
 *  `og:description`, que es lo que renderiza la tarjeta del link (mismo patrón
 *  que Spitwise). */
function lockup(orientation: "horizontal" | "vertical"): ReactElement {
  const horizontal = orientation === "horizontal";
  const tileSize = horizontal ? 200 : 260;
  return h(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: horizontal ? "row" : "column",
        alignItems: "center",
        gap: horizontal ? 52 : 40,
        padding: 60,
        background: CREAM,
      },
    },
    tile(tileSize, { bordered: true }),
    wordmark(horizontal ? 116 : 96),
  );
}

async function png(el: ReactElement, width: number, height: number): Promise<Buffer> {
  const res = new ImageResponse(el, {
    width,
    height,
    fonts: [{ name: "Anton", data: anton, weight: 400, style: "normal" }],
  });
  return Buffer.from(await res.arrayBuffer());
}

async function save(buf: Buffer, name: string, root = BRAND) {
  const p = path.join(root, name);
  await writeFile(p, buf);
  console.log(`  ${path.relative(ROOT, p)}  ${(buf.length / 1024).toFixed(1)} KB`);
}

/**
 * Empaqueta PNGs en un .ico. El formato admite PNG embebido tal cual (soportado
 * por todo browser moderno y por Office), así que alcanza con el header.
 */
function ico(images: { size: number; buf: Buffer }[]): Buffer {
  const HEADER = 6;
  const ENTRY = 16;
  const header = Buffer.alloc(HEADER);
  header.writeUInt16LE(0, 0); // reservado
  header.writeUInt16LE(1, 2); // tipo: icono
  header.writeUInt16LE(images.length, 4);

  let offset = HEADER + ENTRY * images.length;
  const entries: Buffer[] = [];
  for (const { size, buf } of images) {
    const e = Buffer.alloc(ENTRY);
    e.writeUInt8(size >= 256 ? 0 : size, 0); // ancho (0 == 256)
    e.writeUInt8(size >= 256 ? 0 : size, 1); // alto
    e.writeUInt8(0, 2); // paleta
    e.writeUInt8(0, 3); // reservado
    e.writeUInt16LE(1, 4); // planos
    e.writeUInt16LE(32, 6); // bits por pixel
    e.writeUInt32LE(buf.length, 8);
    e.writeUInt32LE(offset, 12);
    entries.push(e);
    offset += buf.length;
  }
  return Buffer.concat([header, ...entries, ...images.map((i) => i.buf)]);
}

async function main() {
  masterSvg = await readFile(MASTER, "utf8");
  anton = await readFile(ANTON);
  await mkdir(BRAND, { recursive: true });

  // --- Mark suelto (mano sobre transparente) ---------------------------
  console.log("mark …");
  await save(await png(tile(512, { transparent: true, rounded: false, handFrac: 0.98 }), 512, 512), "mark.png");

  // --- Tiles redondeados (favicon, avatar del link, uso inline) --------
  console.log("mark-tile …");
  for (const size of [512, 192, 96]) {
    const el = tile(size, { bordered: true });
    const name = size === 512 ? "mark-tile.png" : `mark-tile-${size}.png`;
    await save(await png(el, size, size), name);
  }

  // --- PWA / apple-touch: cuadrado full-bleed, lo redondea el SO -------
  console.log("PWA …");
  await save(await png(tile(180, { rounded: false }), 180, 180), "apple-icon.png", PUB);
  await save(await png(tile(192, { rounded: false }), 192, 192), "icon-192.png", PUB);
  await save(await png(tile(512, { rounded: false }), 512, 512), "icon-512.png", PUB);
  // maskable: mano más chica por la safe-zone del launcher (recorta ~10% por lado)
  await save(await png(tile(192, { rounded: false, handFrac: 0.62 }), 192, 192), "icon-maskable-192.png", PUB);
  await save(await png(tile(512, { rounded: false, handFrac: 0.62 }), 512, 512), "icon-maskable-512.png", PUB);

  // --- favicon.ico (16/32/48, convención de Next en src/app) -----------
  console.log("favicon …");
  const icoSizes = [16, 32, 48];
  const icoImgs = await Promise.all(
    icoSizes.map(async (size) => ({
      size,
      buf: await png(tile(size, { bordered: true }), size, size),
    })),
  );
  await save(ico(icoImgs), "favicon.ico", path.join(ROOT, "src", "app"));

  // --- Lockups + og-image ----------------------------------------------
  console.log("lockups / og …");
  await save(await png(lockup("horizontal"), 840, 320), "lockup-horizontal.png");
  await save(await png(lockup("vertical"), 500, 560), "lockup-vertical.png");

  const og = h(
    "div",
    {
      style: {
        width: 1200,
        height: 630,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: CREAM,
      },
    },
    lockup("horizontal"),
  );
  await save(await png(og, 1200, 630), "og-image.png");

  console.log("OK");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
