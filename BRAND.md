# Marca Andiamo

La marca es **la mano** (el gesto italiano, en ladrillo `#C44428`) + **ANDIAMO**
en Anton. Todo sale de un único master vectorial.

```
brand/logo-master.svg      ← master. Si cambia el trazo, cambia acá.
brand/fonts/Anton-Regular.ttf
        │
        └─ npm run brand:build  (scripts/build-brand.ts, next/og — sin deps nuevas)
                │
                ├─ public/brand/*   variantes de marca
                ├─ public/icon-*    PWA + apple-touch
                └─ src/app/favicon.ico
```

Los PNG generados **se commitean**: el build de Next no corre el script.
Después de tocar el master (o los colores), correr `npm run brand:build` y
commitear la salida.

## Assets generados

| Archivo | Uso |
|---|---|
| `public/brand/mark.png` | Mano sola, fondo transparente. Composiciones externas. |
| `public/brand/mark-tile.png` (512) · `-192` · `-96` | Tile crema redondeado con hairline. Favicon PNG, avatar de la tarjeta de link. |
| `public/brand/lockup-horizontal.png` · `-vertical.png` | Marca completa para docs, slides, README. |
| `public/brand/og-image.png` | **Preview social 1200×630.** Es lo que llena la tarjeta al pegar el link en Word / WhatsApp / Slack. |
| `public/icon-192/512.png`, `icon-maskable-*`, `apple-icon.png` | Instalación de la PWA. Cuadrados full-bleed: las esquinas las redondea el SO. |
| `src/app/favicon.ico` | 16/32/48 embebidos como PNG. |
| `public/logo.svg` | Mano vectorial suelta, para `<link rel="icon" type="image/svg+xml">`. |

**El tile es crema (`#F3ECD8`) con la mano en ladrillo, no al revés.** Es una
decisión de marca: coherente con el canvas de la app. Como el crema tiene poco
contraste sobre el blanco de una pestaña, se compensa ópticamente — la mano
ocupa el **82%** del alto del tile y el tile lleva un borde de `1/32` del lado
en `#D8CFB4` (`border`), así el ícono se recorta en vez de fundirse. No bajar
ese 82% sin mirar `mark-tile-96.png` reducido a 16px.

## En la app: `src/components/Brand.tsx`

Inline SVG, no `<img src="/brand/…">`: cero requests y funciona offline sin
depender del service worker.

| Componente | Cuándo |
|---|---|
| `<Wordmark size="sm" \| "lg" \| "xl" tone />` | Firma obligatoria del header de cada pantalla (`PageHeader`). `sm` header · `lg` 404 · `xl` login. |
| `<Mark className tone />` | La mano sola. Se pinta con `currentColor`, así que cualquier `text-*` la tiñe. |
| `<Lockup orientation tagline size tone />` | Pantallas donde la marca *es* el contenido: login, 404. |
| `<BrandDots />` | Acento decorativo (tres puntos decrecientes en ladrillo) para cerrar un título sin meter otra regla. |

`tone="dark"` es para fondos oscuros: pinta mano y texto en crema.

El copy de marca (título, tagline, URL, path del og-image) vive en
`src/lib/brand.ts` — **no duplicar strings**: lo consumen `layout.tsx`,
`login/page.tsx`, `manifest.ts`, `not-found.tsx`.

## Tarjeta de link (Word / WhatsApp / Slack)

Tres cosas tienen que estar bien a la vez, y las tres se rompen fácil:

1. **`og:image` absoluto.** Sale de `metadataBase` en `src/app/layout.tsx`
   (`SITE_URL`, override con `NEXT_PUBLIC_SITE_URL`). Sin base, Next emite una
   URL relativa y Office la descarta.
2. **La metadata la ve `/login`.** `/` redirige ahí sin sesión, así que el
   crawler nunca lee el título del root: `src/app/login/page.tsx` repite
   `openGraph`/`twitter`. Si el título del login vuelve a decir "Acceder", eso
   es lo que se ve en la tarjeta.
3. **`/brand/` es público en el proxy.** `src/proxy.ts` lo lista en
   `PUBLIC_PATHS`; el crawler pide la imagen sin cookie y detrás del gate
   recibiría un 307 a `/login` — tarjeta vacía.

Word y WhatsApp cachean previews con ganas: para forzar un refresh, probar la
URL con `?v=2`.
