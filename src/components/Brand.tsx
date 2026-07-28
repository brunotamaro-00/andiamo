/**
 * Piezas de marca de Andiamo. Un solo módulo, como `ui/Brand.tsx` en Spitwise.
 *
 * El dibujo de la mano vive acá una sola vez (`HAND_PATHS`), en sync con
 * `brand/logo-master.svg`, que es el master del que `npm run brand:build`
 * deriva favicon, iconos PWA, lockups y og-image. Si cambia el trazo, cambian
 * los dos y se regeneran los PNG.
 *
 * Va inline (no `<img src="/brand/...">`) a propósito: cero requests y funciona
 * offline sin depender de que el service worker haya cacheado el asset.
 */

/** Relación del viewBox del master — no tocar sin regenerar los assets. */
const VIEW_BOX = "330 230 360 520";

const HAND_PATHS = [
  "M5415 7738 c-50 -58 -101 -153 -110 -208 -6 -34 -2 -41 67 -116 40 -44 134 -147 208 -229 74 -82 187 -206 250 -275 63 -70 211 -232 329 -361 l214 -235 213 -629 c118 -345 216 -631 219 -634 3 -2 4 263 3 590 l-3 594 -25 55 c-17 37 -74 111 -180 230 -85 96 -327 371 -539 610 -211 239 -428 486 -483 548 -55 61 -103 112 -108 112 -5 0 -29 -24 -55 -52z",
  "M5236 7268 c-92 -136 -99 -305 -17 -466 16 -32 103 -173 192 -313 89 -140 188 -294 219 -344 31 -49 74 -117 95 -150 l39 -60 43 -380 c23 -209 42 -383 43 -387 0 -5 -182 -8 -405 -8 -223 0 -405 1 -405 3 0 3 74 434 129 752 92 537 91 564 -18 750 -27 46 -58 106 -68 135 -23 66 -76 119 -167 165 -94 48 -127 50 -138 10 -5 -16 -49 -187 -98 -380 -49 -192 -110 -424 -134 -515 l-45 -165 -148 -143 c-81 -78 -208 -200 -281 -270 -273 -260 -440 -515 -542 -827 -91 -282 -100 -382 -100 -1192 l0 -643 784 0 784 0 7 47 c10 67 48 165 89 226 68 102 25 68 1101 859 477 351 486 359 521 405 53 69 77 146 77 238 0 76 -7 98 -118 420 -64 187 -181 530 -260 762 -79 232 -149 432 -156 444 -6 12 -82 99 -168 193 -86 94 -293 321 -459 504 -167 182 -313 343 -324 357 -27 34 -30 33 -72 -27z",
];

/** Fondo sobre el que se apoya la marca: claro (canvas/surface) u oscuro. */
export type BrandTone = "light" | "dark";

const MARK_TONE: Record<BrandTone, string> = {
  light: "text-brick",
  dark: "text-canvas",
};

const TEXT_TONE: Record<BrandTone, string> = {
  light: "text-ink",
  dark: "text-canvas",
};

/**
 * La mano sola. Se pinta con `currentColor`, así que cualquier `text-*` del
 * contenedor la tiñe (útil para estados apagados: `text-ink-faint`).
 */
export function Mark({
  className = "w-6",
  tone,
}: {
  /** Ancho + cualquier `text-*` que la tiña. */
  className?: string;
  /** Atajo para el color de marca. Omitilo si ya pasás un `text-*`. */
  tone?: BrandTone;
}) {
  return (
    <svg
      viewBox={VIEW_BOX}
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
      className={[tone ? MARK_TONE[tone] : "", className, "h-auto"].filter(Boolean).join(" ")}
    >
      <g transform="translate(0,1024) scale(0.1,-0.1)" fill="currentColor" fillRule="evenodd">
        {HAND_PATHS.map((d) => (
          <path key={d.slice(0, 24)} d={d} />
        ))}
      </g>
    </svg>
  );
}

/** `sm` header · `lg` hero de login/404 · `xl` splash. */
export type WordmarkSize = "sm" | "lg" | "xl";

const MARK_WIDTH: Record<WordmarkSize, string> = {
  sm: "w-6",
  lg: "w-9",
  xl: "w-12",
};

const TEXT_SIZE: Record<WordmarkSize, string> = {
  sm: "text-2xl",
  lg: "text-4xl",
  xl: "text-5xl",
};

/** Mano + "Andiamo" en Anton. Es la firma obligatoria del header de cada pantalla. */
export function Wordmark({ size = "sm", tone = "light" }: { size?: WordmarkSize; tone?: BrandTone }) {
  return (
    <span className="inline-flex items-center gap-2 select-none">
      <Mark className={MARK_WIDTH[size]} tone={tone} />
      <span
        className={[
          "font-display uppercase tracking-tight inline-block leading-none",
          TEXT_SIZE[size],
          TEXT_TONE[tone],
        ].join(" ")}
      >
        Andiamo
      </span>
    </span>
  );
}

/**
 * Marca completa con tagline, para pantallas donde la marca ES el contenido
 * (login, 404). Equivale al `lockup-*.png` que genera el build de marca.
 */
export function Lockup({
  orientation = "vertical",
  tagline,
  size = "lg",
  tone = "light",
}: {
  orientation?: "vertical" | "horizontal";
  /** Bajada bajo el wordmark. Sin esto es solo el wordmark centrado. */
  tagline?: string;
  size?: WordmarkSize;
  tone?: BrandTone;
}) {
  const vertical = orientation === "vertical";
  return (
    <div className={vertical ? "flex flex-col items-center text-center" : "flex items-center gap-4"}>
      <Wordmark size={size} tone={tone} />
      {tagline && (
        <p
          className={[
            "text-[11px] font-extrabold uppercase tracking-[0.08em]",
            tone === "dark" ? "text-canvas/70" : "text-ink-3",
            vertical ? "mt-2" : "",
          ].join(" ")}
        >
          {tagline}
        </p>
      )}
    </div>
  );
}

/**
 * Acento decorativo: tres puntos decrecientes en ladrillo — el equivalente del
 * `SpitDivider` de Spitwise. Sirve para cerrar un título o marcar una sección
 * sin meter otra regla horizontal.
 */
export function BrandDots({ className = "" }: { className?: string }) {
  return (
    <span aria-hidden="true" className={["inline-flex items-center gap-1", className].join(" ")}>
      <span className="h-1.5 w-1.5 rounded-full bg-brick/70" />
      <span className="h-1 w-1 rounded-full bg-brick/40" />
      <span className="h-0.5 w-0.5 rounded-full bg-brick/20" />
    </span>
  );
}
