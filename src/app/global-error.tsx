"use client";

import { useEffect } from "react";

/** Last-resort boundary: error.tsx sits *inside* the root layout, so it can't
 *  catch a failure in the layout itself (Providers, TabBar, PullToRefresh,
 *  ServiceWorkerRegister). Without this, such a failure is a blank screen — on
 *  a phone, mid-trip, with no devtools. Ships its own <html>/<body> because it
 *  replaces the root layout, and inlines its styles since globals.css may be
 *  exactly what failed to load. */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global-error]", error);
  }, [error]);

  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.75rem",
          padding: "2rem",
          textAlign: "center",
          background: "#F3ECD8",
          color: "#1B1A17",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <p
          style={{
            fontSize: "2rem",
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "#C44428",
          }}
        >
          Andiamo
        </p>
        <h1 style={{ fontSize: "1.125rem", fontWeight: 700, margin: 0 }}>Algo salió mal</h1>
        <p style={{ fontSize: "0.875rem", color: "#6B6452", maxWidth: "20rem", lineHeight: 1.6 }}>
          La app no pudo arrancar. Probá de nuevo; si sigue fallando, abrí el itinerario guardado.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "1.25rem" }}>
          <button
            onClick={reset}
            style={{
              minHeight: 44,
              padding: "0.625rem 1.5rem",
              background: "#C44428",
              color: "#FFFFFF",
              border: "none",
              borderRadius: 2,
              boxShadow: "3px 3px 0 #1B1A17",
              fontSize: "0.875rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              fontFamily: "inherit",
              cursor: "pointer",
            }}
          >
            Reintentar
          </button>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages --
              global-error replaces the root layout when it renders, so there is
              no Next router mounted for next/link to use. A full page load is
              the only way out of here, and it is also what we want: it rebuilds
              the app from scratch. */}
          <a
            href="/stops"
            style={{
              minHeight: 44,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0.625rem 1.5rem",
              border: "2px solid #1B1A17",
              borderRadius: 2,
              color: "#1B1A17",
              textDecoration: "none",
              fontSize: "0.875rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Ver itinerario
          </a>
        </div>
      </body>
    </html>
  );
}
