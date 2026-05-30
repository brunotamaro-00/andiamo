"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas px-4">
      <div className="text-center max-w-sm">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-2xl bg-danger-bg border border-danger/30 flex items-center justify-center">
            <AlertTriangle
              className="text-danger"
              size={22}
              strokeWidth={1.5}
              aria-hidden="true"
            />
          </div>
        </div>
        <h1 className="text-lg font-semibold font-display text-ink">
          Algo salió mal
        </h1>
        <p className="text-sm text-ink-3 mt-1">
          No pudimos cargar esta sección. Probá de nuevo.
        </p>
        <div className="mt-5 flex justify-center">
          <Button variant="primary" onClick={reset}>
            <RotateCw size={14} strokeWidth={1.5} aria-hidden="true" />
            Reintentar
          </Button>
        </div>
      </div>
    </div>
  );
}
