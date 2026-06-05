import type { Metadata, Viewport } from "next";
import { Anton, Hanken_Grotesk, Archivo } from "next/font/google";
import "./globals.css";
import { TabBar } from "@/components/TabBar";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { InstallPrompt } from "@/components/InstallPrompt";

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
  title: "Andiamo — Tu guía de viaje",
  description: "Guía personal de viaje — Andiamo",
  robots: { index: false, follow: false },
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Andiamo" },
  icons: {
    icon: [
      { url: "/logo.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#F3ECD8",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`h-full ${anton.variable} ${hanken.variable} ${archivo.variable}`}>
      <body className="h-full bg-canvas text-ink antialiased font-sans flex flex-col overflow-hidden">
        <main id="scroll-root" className="flex-1 overflow-y-auto overscroll-contain">
          {children}
        </main>
        <TabBar />
        <InstallPrompt />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
