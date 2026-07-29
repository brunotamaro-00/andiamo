import type { Metadata, Viewport } from "next";
import { Anton, Hanken_Grotesk, Archivo } from "next/font/google";
import "./globals.css";
import "flag-icons/css/flag-icons.min.css";
import { TabBar } from "@/components/TabBar";
import { Providers } from "@/components/Providers";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { InstallPrompt } from "@/components/InstallPrompt";
import { OfflineBanner } from "@/components/OfflineBanner";
import { DemoBanner } from "@/components/DemoBanner";
import { DemoIntro } from "@/components/DemoIntro";
import { IS_DEMO } from "@/lib/demo";
import { PullToRefresh } from "@/components/PullToRefresh";
import { BRAND_NAME, BRAND_OG_IMAGE, BRAND_TAGLINE, BRAND_TITLE, SITE_URL } from "@/lib/brand";

const anton = Anton({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-anton",
  display: "swap",
});

const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-hanken",
  display: "swap",
});

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["900"],
  variable: "--font-archivo",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: BRAND_TITLE,
  description: BRAND_TAGLINE,
  applicationName: BRAND_NAME,
  robots: { index: false, follow: false },
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: BRAND_NAME },
  icons: {
    icon: [
      // El tile crema con borde lee mejor que el SVG suelto a 16px (pestañas,
      // tarjeta de link de Word). El SVG queda como versión vectorial.
      { url: "/brand/mark-tile-96.png", sizes: "96x96", type: "image/png" },
      { url: "/logo.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  // La preview social se define acá y en /login (la página que ve el crawler,
  // porque / redirige). Ambas apuntan al mismo lockup.
  openGraph: {
    type: "website",
    siteName: BRAND_NAME,
    title: BRAND_TITLE,
    description: BRAND_TAGLINE,
    locale: "es_ES",
    images: [{ url: BRAND_OG_IMAGE, width: 1200, height: 630, alt: BRAND_NAME }],
  },
  twitter: {
    card: "summary_large_image",
    title: BRAND_TITLE,
    description: BRAND_TAGLINE,
    images: [BRAND_OG_IMAGE],
  },
};

export const viewport: Viewport = {
  // White to match the sticky header (bg-surface) so the iOS/Android status-bar
  // strip blends into the header instead of showing a cream seam in the PWA.
  themeColor: "#FFFFFF",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // data-scroll-behavior: globals.css sets scroll-behavior: smooth on <html>; this
  // tells Next to suppress it during route transitions (and silences the console
  // warning it logs otherwise).
  return (
    <html
      lang="es"
      data-scroll-behavior="smooth"
      className={`h-full ${anton.variable} ${hanken.variable} ${archivo.variable}`}
    >
      <body className="h-full bg-canvas text-ink antialiased font-sans flex flex-col overflow-hidden">
        {/* First flex children so they push the header down instead of overlaying it. */}
        <DemoBanner />
        <OfflineBanner />
        {IS_DEMO ? <DemoIntro /> : null}
        <Providers>
          <main id="scroll-root" className="flex-1 overflow-y-auto overscroll-contain [scrollbar-gutter:stable]">
            {children}
          </main>
          <TabBar />
        </Providers>
        <PullToRefresh />
        <InstallPrompt />
        <ServiceWorkerRegister />
        {/* Portal target for modals — outside scroll-root so inert doesn't block modal interaction */}
        <div id="modal-root" />
      </body>
    </html>
  );
}
