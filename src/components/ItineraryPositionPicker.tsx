"use client";

import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import { ChevronRight, Plus } from "lucide-react";
import { Flag } from "@/components/Flag";
import { Button } from "@/components/ui/Button";
import { labelClass } from "@/components/ui/Field";
import { springSheet } from "@/lib/motion";
import {
  clampSlot,
  previewItinerary,
  slotLabel,
  type MovingStop,
  type SpineStop,
} from "@/lib/itinerary-slots";

interface Props {
  /** The itinerary spine, in order, WITHOUT the city being placed. */
  spine: SpineStop[];
  moving: MovingStop;
  slot: number;
  onChange: (slot: number) => void;
  /** `Setting.tripStartDate` — the only date input the itinerary has. */
  tripStartStr: string | null;
}

/**
 * Position picker — the itinerary as a strip of time with a tappable gap
 * between every stop.
 *
 * Replaces a native `<select>` of "Después de X" options: with ~30 stops that
 * was an OS dropdown of identical strings, with no sense of *where* the city
 * lands. Here the whole sequence is visible, and the chosen gap opens into the
 * city itself, showing the arrival date it would actually get — computed by the
 * same walk the server runs on save (`previewItinerary`), so the preview can't
 * drift from the result.
 */
export function ItineraryPositionPicker({
  spine,
  moving,
  slot,
  onChange,
  tripStartStr,
}: Props) {
  const selected = clampSlot(spine, slot);
  const rows = previewItinerary(spine, moving, selected, tripStartStr);
  const byId = new Map(rows.filter((r) => !r.isMoving).map((r) => [r.id, r]));
  const movingRow = rows.find((r) => r.isMoving)!;
  const ghostRef = useRef<HTMLButtonElement>(null);

  // Open on the current choice rather than at the top — with 30 stops the
  // selected gap is usually far below the fold.
  useEffect(() => {
    ghostRef.current?.scrollIntoView({ block: "center" });
    ghostRef.current?.focus({ preventScroll: true });
    // Mount only: re-running on every pick would fight the user's scrolling.
  }, []);

  function handleKeyDown(e: React.KeyboardEvent) {
    const next =
      e.key === "ArrowDown" || e.key === "ArrowRight"
        ? selected + 1
        : e.key === "ArrowUp" || e.key === "ArrowLeft"
        ? selected - 1
        : e.key === "Home"
        ? 0
        : e.key === "End"
        ? spine.length
        : null;
    if (next === null) return;
    e.preventDefault();
    onChange(clampSlot(spine, next));
  }

  return (
    <div
      role="radiogroup"
      aria-label="Posición en el itinerario"
      onKeyDown={handleKeyDown}
      // Full-bleed inside the sheet's px-5 body: the list should read as the
      // itinerary itself, not as a control sitting on a form.
      className="-mx-5"
    >
      {Array.from({ length: spine.length + 1 }, (_, i) => {
        const stop = i < spine.length ? spine[i] : null;
        const row = stop ? byId.get(stop.id) : null;
        return (
          <div key={stop ? stop.id : "end"}>
            {i === selected ? (
              <motion.button
                ref={ghostRef}
                key={`ghost-${selected}`}
                type="button"
                role="radio"
                aria-checked
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={springSheet}
                className="mx-5 my-2 block w-[calc(100%-2.5rem)] rounded-lg border-2 border-brick bg-brick-bg px-3 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick/40"
              >
                <span className="flex items-baseline gap-2">
                  <Flag flag={moving.countryFlag} className="text-sm" />
                  <span className="font-display text-title-sm uppercase tracking-wide text-brick-ink">
                    {moving.name || "Nueva ciudad"}
                  </span>
                  <span className="ml-auto text-[11px] font-semibold text-brick-ink">
                    {nightsLabel(moving.nights)}
                  </span>
                </span>
                <span className="mt-0.5 block text-[11px] text-ink-2">
                  {movingRow.arrival
                    ? `Llega el ${formatDay(movingRow.arrival)}`
                    : "Sin fecha — falta el inicio del viaje"}
                  {moving.isCandidate && " · tentativa"}
                </span>
              </motion.button>
            ) : (
              <SlotButton index={i} onSelect={() => onChange(i)} spine={spine} />
            )}

            {stop && (
              <div className="flex items-baseline gap-2 px-5 py-2">
                <Flag flag={stop.countryFlag} className="text-sm" />
                <span
                  className={`text-sm ${
                    stop.isCandidate ? "text-ink-3 italic" : "text-ink-2"
                  }`}
                >
                  {stop.name}
                </span>
                <span className="ml-auto shrink-0 text-[11px] tabular-nums text-ink-3">
                  {row?.arrival ? formatDay(row.arrival) : nightsLabel(stop.nights)}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Confirm bar for the picker view. Sticky, because the list is as long as the
 * trip: picking a gap near the top and then scrolling past thirty stops to find
 * the button is not a choice anyone should have to make.
 */
export function PositionPickerFooter({ onDone }: { onDone: () => void }) {
  return (
    // `bottom-0` sticks to the scroll container's padding edge, so the sheet's
    // own safe-area padding stays below the bar — don't add it again here.
    <div className="sticky bottom-0 -mx-5 border-t border-border bg-surface px-5 pb-3 pt-3">
      <Button type="button" variant="primary" className="w-full" onClick={onDone}>
        Listo
      </Button>
    </div>
  );
}

/**
 * The collapsed form field that opens the picker: names the gap in words and
 * shows the resulting arrival date, so the common case (accept the default,
 * usually "al final") never needs the list at all.
 */
export function PositionField({
  spine,
  moving,
  slot,
  tripStartStr,
  onOpen,
}: {
  spine: SpineStop[];
  moving: MovingStop;
  slot: number;
  tripStartStr: string | null;
  onOpen: () => void;
}) {
  const rows = previewItinerary(spine, moving, slot, tripStartStr);
  const arrival = rows.find((r) => r.isMoving)?.arrival ?? null;

  return (
    <div>
      <span className={labelClass}>Posición en el itinerario</span>
      <button
        type="button"
        onClick={onOpen}
        className="flex min-h-[44px] w-full items-center gap-3 rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-left transition-colors duration-150 hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick/40"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm text-ink">
            {slotLabel(spine, slot)}
          </span>
          {arrival && (
            <span className="mt-0.5 block text-[11px] text-ink-3">
              Llega el {formatDay(arrival)}
            </span>
          )}
        </span>
        <ChevronRight
          size={16}
          strokeWidth={1.5}
          aria-hidden="true"
          className="shrink-0 text-ink-3"
        />
      </button>
    </div>
  );
}

/** An empty gap: reads as a hairline, but the negative margins keep the 44px
 *  touch target the design system requires without a 44px visual gutter. */
function SlotButton({
  index,
  onSelect,
  spine,
}: {
  index: number;
  onSelect: () => void;
  spine: SpineStop[];
}) {
  const before = index > 0 ? spine[index - 1] : null;
  const after = index < spine.length ? spine[index] : null;
  const label = !before
    ? `Al principio, antes de ${after?.name ?? "todo"}`
    : !after
    ? `Al final, después de ${before.name}`
    : `Entre ${before.name} y ${after.name}`;

  return (
    <button
      type="button"
      role="radio"
      aria-checked={false}
      tabIndex={-1}
      aria-label={label}
      onClick={onSelect}
      className="group relative -my-[14px] flex h-11 w-full items-center px-5 focus-visible:outline-none"
    >
      <span className="h-px flex-1 bg-border transition-colors duration-150 group-hover:bg-brick-border group-focus-visible:bg-brick" />
      <span className="ml-2 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-border text-ink-faint opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100">
        <Plus size={10} strokeWidth={2.5} aria-hidden="true" />
      </span>
    </button>
  );
}

function nightsLabel(n: number): string {
  if (n === 0) return "tránsito";
  return n === 1 ? "1 noche" : `${n} noches`;
}

function formatDay(d: Date): string {
  return d.toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}
