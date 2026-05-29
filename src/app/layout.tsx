import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Europa 2026 — Guía de viaje",
  description: "Guía personal para el viaje por Europa 2026",
  robots: { index: false, follow: false },
  manifest: "/manifest.json",
  themeColor: "#0f172a",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Europa 2026" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full">
      <body className="min-h-full bg-slate-950 text-slate-100 antialiased">{children}</body>
    </html>
  );
}
