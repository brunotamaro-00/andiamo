"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { Plus, AlertCircle, RotateCcw, MapPin, SearchX } from "lucide-react";
import { createStop } from "@/app/actions/stops";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { inputClass } from "@/components/ui/Field";
import { Label } from "@/components/ui/Label";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { NightsStepper } from "@/components/ui/NightsStepper";
import { ToggleRow } from "@/components/ui/ToggleRow";
import { flagFromCountryCode } from "@/lib/country-currency";
import { fetchWithTimeout, TIMEOUT_INTERACTIVE_MS } from "@/lib/fetch-timeout";
import {
  ItineraryPositionPicker,
  PositionField,
  PositionPickerFooter,
} from "@/components/ItineraryPositionPicker";
import { afterOrderForSlot, type SpineStop } from "@/lib/itinerary-slots";

interface GeoResult {
  name: string;
  admin1: string | null;
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

interface Props {
  /** The itinerary spine — see `itinerarySpine()` in `@/lib/itinerary-slots`. */
  stops: SpineStop[];
  tripStartStr: string | null;
}

export function AddStopButton(props: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={[
          "mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl",
          "border border-dashed border-border-strong bg-surface/50 text-sm text-ink-3",
          "hover:border-brick-border/50 hover:bg-surface hover:text-ink transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick",
          "focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <Plus size={14} strokeWidth={1.5} aria-hidden="true" />
        Agregar ciudad
      </button>
      {open && <AddStopModal {...props} onClose={() => setOpen(false)} />}
    </>
  );
}

/** Sheet steps. The city search and the position picker are full-body views,
 *  not extra fields — stacking them into one scroll is what made this form
 *  repeat the city name twice and hide the position behind an OS dropdown. */
type Step = "search" | "detail" | "position";

function AddStopModal({
  stops, tripStartStr, onClose,
}: Props & { onClose: () => void }) {
  const [step, setStep] = useState<Step>("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeoResult[]>([]);
  const [selected, setSelected] = useState<GeoResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [nights, setNights] = useState(3);
  const [isCandidate, setIsCandidate] = useState(false);
  // Default: at the end of the trip — the overwhelmingly common case.
  const [slot, setSlot] = useState(stops.length);
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Monotonic id of the newest in-flight geocode. Responses can land out of
  // order, so a slow earlier search used to overwrite the current results.
  const requestIdRef = useRef(0);

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      // Invalidate anything still in flight so it can't setState after unmount.
      requestIdRef.current += 1;
    },
    [],
  );

  function handleQueryChange(val: string) {
    setQuery(val);
    setGeoError(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const requestId = ++requestIdRef.current;
      setSearching(true);
      try {
        // Without a deadline a stalled request left "Buscando…" up forever:
        // the catch that shows the error never ran.
        const res = await fetchWithTimeout(
          `/api/geocode?q=${encodeURIComponent(val)}`,
          {},
          TIMEOUT_INTERACTIVE_MS,
        );
        if (!res.ok) throw new Error(`geocode ${res.status}`);
        const data = await res.json();
        if (requestId !== requestIdRef.current) return;
        setResults(data.results ?? []);
      } catch {
        if (requestId !== requestIdRef.current) return;
        setResults([]);
        setGeoError("No se pudo buscar. Revisá la conexión.");
      } finally {
        if (requestId === requestIdRef.current) setSearching(false);
      }
    }, 400);
  }

  function handleSubmit(formData: FormData) {
    if (!selected) return;
    formData.set("name", selected.name);
    formData.set("country", selected.country);
    formData.set("countryCode", selected.countryCode);
    formData.set("latitude", selected.latitude.toString());
    formData.set("longitude", selected.longitude.toString());
    // Open-Meteo omits `timezone` on some results; String(undefined) would post
    // the literal "undefined", which the schema rejects. Empty means "unknown"
    // and falls back to the trip timezone.
    formData.set("timezone", selected.timezone ?? "");
    formData.set("isCandidate", isCandidate ? "true" : "false");
    formData.set("insertAfterOrder", String(afterOrderForSlot(stops, slot)));
    setSubmitError(null);
    // async callback: keeps isPending true until the action resolves
    startTransition(async () => {
      try {
        const result = await createStop(formData);
        if (result?.error) setSubmitError(result.error);
      } catch {
        setSubmitError("No se pudo agregar la parada. Probá de nuevo.");
      }
    });
  }

  const moving = {
    name: selected?.name ?? "",
    // Mirrors what `createStop` derives server-side, so the preview shows the
    // same flag the stop will end up with.
    countryFlag: selected ? flagFromCountryCode(selected.countryCode) : "",
    nights,
    isCandidate,
  };

  if (step === "position") {
    return (
      <Modal
        title="Posición"
        onClose={onClose}
        onBack={() => setStep("detail")}
        locked={isPending}
      >
        <ItineraryPositionPicker
          spine={stops}
          moving={moving}
          slot={slot}
          onChange={setSlot}
          tripStartStr={tripStartStr}
        />
        <PositionPickerFooter onDone={() => setStep("detail")} />
      </Modal>
    );
  }

  if (step === "detail" && selected) {
    return (
      <Modal title="Agregar ciudad" onClose={onClose} locked={isPending}>
        {/* The chosen city as the header of its own form — it used to sit in a
            chip *below* the search box that still held the same name. */}
        <div className="flex items-center gap-3 rounded-xl border-2 border-ink bg-surface px-3 py-3 card-shadow">
          <span className="min-w-0 flex-1">
            <span className="block truncate font-display text-base uppercase tracking-tight text-ink">
              {selected.name}
            </span>
            <span className="mt-0.5 block truncate text-caption text-ink-3">
              {selected.admin1 ? `${selected.admin1} · ` : ""}
              {selected.country}
            </span>
          </span>
          <button
            type="button"
            onClick={() => {
              setStep("search");
              setResults([]);
            }}
            // Quiet on purpose: inside a border-2 card, a second heavy frame
            // would compete with the city name for the focal point.
            className="flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full px-3 label-caps text-ink-3 transition-colors duration-150 hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick/40"
          >
            <RotateCcw size={12} strokeWidth={2} aria-hidden="true" />
            Cambiar
          </button>
        </div>

        <form action={handleSubmit} className="space-y-3">
          {submitError && (
            <p className="text-xs text-danger flex items-center gap-1.5" role="alert">
              <AlertCircle size={12} strokeWidth={1.5} aria-hidden="true" className="shrink-0" />
              {submitError}
            </p>
          )}

          <NightsStepper value={nights} onChange={setNights} />

          <PositionField
            spine={stops}
            moving={moving}
            slot={slot}
            tripStartStr={tripStartStr}
            onOpen={() => setStep("position")}
          />

          <ToggleRow
            label="Tentativa (sin decidir)"
            hint="Recibe fechas pero no corre al resto del viaje."
            checked={isCandidate}
            onChange={setIsCandidate}
          />

          <div className="flex gap-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" className="flex-1" loading={isPending}>
              {isPending ? "Agregando..." : "Agregar"}
            </Button>
          </div>
        </form>
      </Modal>
    );
  }

  return (
    <Modal title="Agregar ciudad" onClose={onClose}>
      <div>
        <Label>Buscar ciudad</Label>
        <input
          type="text"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder="Ej: Brujas, Estocolmo, Dubrovnik..."
          autoFocus
          enterKeyHint="search"
          aria-label="Buscar ciudad"
          className={inputClass}
        />
        {geoError && (
          <p className="text-xs text-danger flex items-center gap-1.5 mt-1" role="alert">
            <AlertCircle size={12} strokeWidth={1.5} aria-hidden="true" className="shrink-0" />
            {geoError}
          </p>
        )}
        <p className="sr-only" role="status" aria-live="polite">
          {searching
            ? "Buscando ciudades"
            : results.length > 0
            ? `${results.length} ciudades encontradas`
            : query.length >= 2
            ? "Sin resultados"
            : ""}
        </p>
      </div>

      {/* The results area holds its height from the start, so the sheet opens
          at the size it will have once you type instead of as a sliver at the
          bottom of the screen that grows under your thumb. */}
      <div className="min-h-[300px]">
        {searching && results.length === 0 && (
          <div className="space-y-1" aria-hidden="true">
            <Skeleton className="h-[58px] w-full" />
            <Skeleton className="h-[58px] w-full opacity-70" />
            <Skeleton className="h-[58px] w-full opacity-40" />
          </div>
        )}

        {!searching && results.length === 0 && (
          <EmptyState
            icon={query.length >= 2 ? SearchX : MapPin}
            title={
              query.length >= 2
                ? `Sin resultados para "${query}"`
                : "¿A qué ciudad van?"
            }
            description={
              query.length >= 2
                ? "Probá con el nombre en su idioma original, o con la ciudad grande más cercana."
                : "Buscala por nombre y elegila de la lista. Después definís las noches y dónde entra en el itinerario."
            }
          />
        )}

        {results.length > 0 && (
        <div className="space-y-1">
          {results.map((r, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setSelected(r);
                setResults([]);
                setStep("detail");
              }}
              className="w-full text-left px-3 py-2.5 rounded-lg bg-surface-2 hover:bg-border transition-colors border border-border hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick"
            >
              <p className="text-sm font-medium text-ink">
                {r.name}{r.admin1 ? `, ${r.admin1}` : ""}
              </p>
              <p className="text-xs text-ink-3">
                {r.country} · {r.latitude.toFixed(2)}, {r.longitude.toFixed(2)}
              </p>
            </button>
          ))}
        </div>
        )}
      </div>

      {selected && (
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          onClick={() => setStep("detail")}
        >
          Volver a {selected.name}
        </Button>
      )}
    </Modal>
  );
}
