# Andiamo — sistema de diseño (dirección y decisiones)

Fuente de verdad de la *dirección* visual. Los tokens viven en `src/app/globals.css`
(`@theme`); las convenciones operativas en `AGENTS.md`. Este archivo registra el
**por qué** y las medidas que no se deducen del código.

## Intención

- **Humano**: Bruno o Katia, en la calle, con una mano, mirando el teléfono entre
  una estación de tren y un hostel. También un recruiter que entra desde el CV.
- **Verbo**: orientarse — ¿dónde estoy, qué sigue, dónde está el voucher?
- **Sensación**: álbum de figuritas Panini + cuaderno de viaje. Cálido, impreso,
  editorial. Nunca "app de productividad", nunca SaaS frío.

## Mundo del producto (domain exploration)

- Dominio: álbum de figuritas (láminas, la dorada rara), pasaporte y sellos,
  boletos de tren Eurail, etiquetas de equipaje, postales, banderines, itinerario
  de mano escrito.
- Mundo de color: papel crema envejecido (`canvas`), ladrillo de techos europeos
  (`brick`), dorado de medallas/marcos (`gold`), verde cancha (`success`), tinta
  de imprenta cálida (`ink`). El violeta `special` es la excepción deliberada
  para "candidata" (fuera del mundo físico a propósito: lo tentativo no existe
  todavía).

## Firma (los movimientos que solo Andiamo hace)

1. **Sticker shadow**: offset duro 2px (`card-shadow`) + difuso cálido. Toda
   elevación es "figurita pegada al papel". Prohibido mezclar con sombras suaves
   genéricas. Press de CTA = la figurita se aplasta (`translate 2px + shadow-none`).
2. **La figurita dorada**: la parada ACTUAL es la figurita especial del álbum —
   tratamiento gold (borde/fondo gold, `border-t-[3px]` brick como marcador de
   "activo" en todo el sistema). El momento "estás acá" es el más celebrado de la app.
3. **Numerales editoriales**: Archivo 900 (`font-numeral`) para todo dato héroe
   (día del viaje, noches, totales) — numeral grande + `label-caps` debajo, como
   el número de figurita. Nunca tres cajitas iguales.
4. **La mano (`Mark`)**: acento en empty states y momentos de marca, pintada con
   `currentColor`.

## Rechazos explícitos (defaults que NO usamos)

- Tres columnas de stats idénticas → franja editorial con un numeral dominante.
- **El timeline de /stops es una lista plana a pedido de Bruno** (2026-08-01):
  bandera en cada card + país en la meta, sin headers por país — se probó la
  agrupación estilo álbum y no gustó; no reintroducirla.
- Iconos genéricos icon-izquierda-label en grillas 2×N sin jerarquía.
- Gradientes decorativos, glassmorphism, sombras negras genéricas, Inter.

## Jerarquía y densidad

- **Un focal point por vista**: `/stops` = la parada de hoy; `/stops/[slug]` = la
  city card; `/guias/[g]/[d]` = la lectura; `/login` = el CTA de demo.
  - `/login` lo cumple literal desde 2026-08: **una sola card** (copy + CTA +
    línea de stack) y el gate de contraseña plegado en un `<details>` discreto,
    abierto server-side solo si hay error. Se fueron el separador "o" y la
    segunda card, que competían con el focal.
  - **Rechazo explícito**: nada de franja de stat editorial en `/login` (se probó
    un numeral "14 regiones con guía propia" y Bruno lo bajó, 2026-08). La card
    dice qué es y manda a la demo; sumar una cifra que nadie pidió le roba
    atención al único focal.
- Escala tipográfica: tokens `text-caption/meta/title-sm/title/title-lg/title-xl/numeral`
  (11/12/13/15/17/22/26) + escala Tailwind estándar. Anton siempre uppercase.
  Jerarquía por peso y color antes que por tamaño (Hanken 400–800).
- Densidad: mobile cómodo — cards `p-4`, listas `gap-3`, grupos separados por
  `space-y-5`+; dentro de un grupo `space-y-2/3`. Base 4px.
- Texto: 4 niveles — `ink` / `ink-2` / `ink-3` / `ink-faint`. Los tres primeros
  pasan WCAG AA sobre canvas/surface (ink-3 = 4.9:1 en canvas — no aclarar);
  `ink-faint` es solo placeholder/disabled, nunca texto informativo.
- Acentos como texto: `gold` y `brick` NO alcanzan AA en tamaños chicos — para
  labels usar `gold-ink` / `brick-ink` (los tonos "tinta" existen para eso).

## Profundidad y superficie (elegida, no mezclar)

- Estrategia única: **borde + sticker shadow**. `border-border` default,
  `border-strong` hover, `border-2` reservado (city header, TodayCard gold,
  chips de selección, botones secondary).
- Inputs más oscuros que la superficie (`surface-2`) — se "hunden" para recibir.
- Radios: `xs 2 / sm 4 / md 6 (solo CTA sticker) / lg 8 (filas internas) /
  xl 12 (cards) / 2xl 16 (modales) / full (pills)`. Concéntrico: exterior =
  interior + padding.

## Motion

- Tokens en `:root` (transitions.dev): stagger 40 / micro 80 / quick 150 /
  fast 250 / medium 350 / slow 400 / very-slow 500 ms; `--ease-smooth-out`.
- Springs canónicos en `src/lib/motion.ts` (sheet 420/38, nav 480/36, toast 500/32).
- Entradas con `animate-fade-in` + `stagger-*`; cierres más rápidos que aperturas.
- Reduced motion: media query global + `MotionConfig reducedMotion="user"`.

## Componentes con medidas

- `Button` primary — sticker CTA: min-h 44px · `rounded-md` · Anton uppercase ·
  `hard-shadow-ink` · press 2px. Como link: prop `href`.
- `Card` — `cardClass` (chrome) + `p-4`; hover lift `-translate-y-[2px]` +
  `hover-shadow-ink`.
- Label — `label-caps` + color explícito (`text-ink-3` default). Form label:
  `<Label>`/`labelClass` (mb-1.5).
- Touch: 44px mínimo en todo (`rowActionBtn`, `h-11 w-11`, `min-h-[44px]`).
- TabBar — píldora `layoutId="tab-pill"`, activo brick, `border-t-2 border-ink`.
