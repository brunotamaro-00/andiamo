import type { MetadataRoute } from "next";

// Warm cream canvas color — keep in sync with viewport.themeColor in layout.tsx
const THEME = "#F3ECD8";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Andiamo",
    short_name: "Andiamo",
    description: "Tu guía personal de viaje — Andiamo",
    lang: "es",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    categories: ["travel"],
    background_color: THEME,
    theme_color: THEME,
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
