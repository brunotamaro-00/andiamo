"use client";

import { useRef, useState, useTransition } from "react";
import { CalendarDays, Loader2 } from "lucide-react";
import { setTripStart } from "@/app/actions/stops";
import { haptics } from "@/lib/haptics";
import { useToast } from "@/components/ui/Toast";

interface Props {
  value: string; // YYYY-MM-DD or "" — the Setting, the trip's only date input
  fallbackValue?: string; // YYYY-MM-DD — first stop's arrivalDate, for display before the Setting exists
}

function formatDisplay(dateStr: string): string {
  if (!dateStr) return "Elegir fecha";
  return new Date(`${dateStr}T00:00:00.000Z`).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * The trip's single date input, in the app's own type.
 *
 * `<input type="date">` paints its value with the platform's own font and
 * format ("05/08/2026" plus a system calendar glyph), which read as a foreign
 * control dropped into the itinerary. The input is still here — it's the only
 * way to get the OS date picker, which is the right picker on a phone — but it
 * sits transparent over the row, so what you see is Andiamo's date and what you
 * tap is the native wheel. Picking a date saves straight away: there was never
 * a confirmation step here anyway, since the recalculation is immediate.
 */
export function TripStartEditor({ value, fallbackValue = "" }: Props) {
  const displayValue = value || fallbackValue;
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    if (!formData.get("tripStartDate")) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await setTripStart(formData);
        if (result?.error) { setError(result.error); return; }
        haptics.success();
        toast("Inicio del viaje actualizado");
      } catch {
        haptics.error();
        setError("No se pudo guardar. Intentá de nuevo.");
      }
    });
  }

  return (
    <form ref={formRef} action={handleSubmit}>
      <div
        className={[
          "relative flex items-center gap-3 rounded-lg border bg-surface px-3 py-2.5 transition-colors duration-150",
          "focus-within:border-brick focus-within:ring-2 focus-within:ring-brick/40",
          error ? "border-danger/50" : "border-border hover:border-border-strong",
        ].join(" ")}
      >
        <span className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-ink-3 shrink-0">
          Inicio del viaje
        </span>
        <span
          className={`flex-1 truncate text-sm font-medium ${
            displayValue ? "text-ink" : "text-ink-faint"
          }`}
          aria-hidden="true"
        >
          {formatDisplay(displayValue)}
        </span>
        {isPending ? (
          <Loader2
            size={14}
            strokeWidth={2}
            aria-hidden="true"
            className="shrink-0 animate-spin text-brick"
          />
        ) : (
          <CalendarDays
            size={14}
            strokeWidth={1.5}
            aria-hidden="true"
            className="shrink-0 text-ink-3"
          />
        )}
        {/* Transparent, but a real input: it keeps the OS picker, the keyboard
            path and the accessible name. `sr-only` would remove the hit area. */}
        <input
          type="date"
          name="tripStartDate"
          defaultValue={displayValue}
          disabled={isPending}
          aria-label="Inicio del viaje"
          onChange={() => formRef.current?.requestSubmit()}
          className="absolute inset-0 h-full w-full cursor-pointer rounded-lg opacity-0 focus:outline-none disabled:cursor-wait"
        />
      </div>
      {error && (
        <p className="mt-1.5 text-[11px] font-medium text-danger" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
