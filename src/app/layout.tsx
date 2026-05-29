import type { Metadata, Viewport } from "next";
import { Montserrat, Inter } from "next/font/google";
import "./globals.css";
import { TabBar } from "@/components/TabBar";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-montserrat",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Europa 2026 — Guía de viaje",
  description: "Guía personal para el viaje por Europa 2026",
  robots: { index: false, follow: false },
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Europa 2026" },
};

export const viewport: Viewport = {
  themeColor: "#14110E",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`h-full ${montserrat.variable} ${inter.variable}`}>
      <body className="min-h-full bg-sand-950 text-sand-100 antialiased font-sans">
        {children}
        <TabBar />
      </body>
    </html>
  );
}
