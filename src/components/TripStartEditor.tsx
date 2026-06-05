"use client";

import { useState, useTransition } from "react";
import { Pencil, Check } from "lucide-react";
import { setTripStart } from "@/app/actions/stops";

interface Props {
  value: string; // YYYY-MM-DD or ""
}

function formatDisplay(dateStr: string): string {
  if (!dateStr) return "—";
  return new Date(`${dateStr}T00:00:00.000Z`).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function TripStartEditor({ value }: Props) {
  const [editing, setEditing] = useState(!value);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await setTripStart(formData);
        if (result?.error) { setError(result.error); return; }
        setEditing(false);
      } catch {
        setError("No se pudo guardar. Intentá de nuevo.");
      }
    });
  }

  if (!editing) {
    return (
      <div className="flex items-center justify-between px-3 py-2.5 rounded-[4px] border border-border bg-surface">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-ink-3">
            Inicio del viaje
          </span>
          <span className="text-sm font-medium text-ink">{formatDisplay(value)}</span>
        </div>
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label="Editar fecha de inicio del viaje"
          className="p-1.5 rounded-full text-ink-3 hover:text-ink hover:bg-surface-2 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick/40"
        >
          <Pencil size={13} strokeWidth={1.5} aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <form action={handleSubmit} className="flex items-center gap-2 px-3 py-2.5 rounded-[4px] border border-brick-border bg-brick-bg/40">
      <span className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-ink-3 shrink-0">
        Inicio del viaje
      </span>
      <input
        type="date"
        name="tripStartDate"
        defaultValue={value}
        autoFocus
        className="flex-1 min-w-0 bg-transparent text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-brick/40 rounded"
      />
      <button
        type="submit"
        disabled={isPending}
        aria-label="Guardar fecha de inicio"
        className="p-1.5 rounded-full text-brick hover:text-brick-hover hover:bg-brick-bg transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick/40 shrink-0 disabled:opacity-50"
      >
        <Check size={14} strokeWidth={2} aria-hidden="true" />
      </button>
      {error && (
        <p className="text-[11px] text-danger font-medium" role="alert">{error}</p>
      )}
    </form>
  );
}
