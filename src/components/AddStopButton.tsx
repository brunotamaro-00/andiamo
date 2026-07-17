"use client";

import { useState, useTransition, useRef } from "react";
import { Plus, X, AlertCircle } from "lucide-react";
import { createStop } from "@/app/actions/stops";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, SelectField, inputClass } from "@/components/ui/Field";
import { Label } from "@/components/ui/Label";

interface GeoResult {
  name: string;
  admin1: string | null;
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

interface StopOption {
  id: string;
  order: number;
  name: string;
  countryFlag: string;
}

interface Props {
  stops: StopOption[];
}

export function AddStopButton({ stops }: Props) {
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
      {open && <AddStopModal stops={stops} onClose={() => setOpen(false)} />}
    </>
  );
}

function AddStopModal({
  stops, onClose,
}: {
  stops: StopOption[];
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeoResult[]>([]);
  const [selected, setSelected] = useState<GeoResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleQueryChange(val: string) {
    setQuery(val);
    setSelected(null);
    setGeoError(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(val)}`);
        if (!res.ok) throw new Error(`geocode ${res.status}`);
        const data = await res.json();
        setResults(data.results ?? []);
      } catch {
        setResults([]);
        setGeoError("No se pudo buscar. Revisá la conexión.");
      } finally {
        setSearching(false);
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
    formData.set("timezone", selected.timezone);
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

  const maxOrder = stops.reduce((m, s) => Math.max(m, s.order), 0);

  return (
    <Modal title="Agregar ciudad" onClose={onClose}>
      {/* City search */}
      <div>
        <Label>Buscar ciudad</Label>
        <input
          type="text"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder="Ej: Brujas, Estocolmo, Dubrovnik..."
          autoFocus
          aria-label="Buscar ciudad"
          className={inputClass}
        />
        {searching && (
          <p className="text-xs text-ink-3 mt-1">Buscando...</p>
        )}
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
            : query.length >= 2 && !selected
            ? "Sin resultados"
            : ""}
        </p>
      </div>

      {/* Search results */}
      {!selected && results.length > 0 && (
        <div className="space-y-1">
          {results.map((r, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setSelected(r);
                setResults([]);
                setQuery(r.name);
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

      {/* Selected city chip */}
      {selected && (
        <div className="flex items-center gap-2 px-3 py-2 bg-brick-bg border border-brick-border/40 rounded-lg">
          <span className="text-sm font-medium text-brick-ink flex-1">
            {selected.name}
          </span>
          <span className="text-xs text-ink-2">{selected.country}</span>
          <button
            onClick={() => {
              setSelected(null);
              setQuery("");
            }}
            aria-label="Quitar ciudad seleccionada"
            className="h-11 w-11 -my-2 flex items-center justify-center rounded-lg text-ink-3 hover:text-ink hover:bg-surface-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick"
          >
            <X size={14} strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Form — only visible when a city is selected */}
      {selected && (
        <form action={handleSubmit} className="space-y-3">
          {submitError && (
            <p className="text-xs text-danger flex items-center gap-1.5" role="alert">
              <AlertCircle size={12} strokeWidth={1.5} aria-hidden="true" className="shrink-0" />
              {submitError}
            </p>
          )}
          <Field
            label="Noches"
            name="nights"
            type="number"
            inputMode="numeric"
            defaultValue={3}
            min={0}
            required
          />

          <SelectField
            label="Insertar después de"
            name="insertAfterOrder"
            defaultValue={String(maxOrder)}
          >
            <option value="0">Al principio</option>
            {stops.map((s) => (
              <option key={s.id} value={s.order}>
                Después de {s.name}
              </option>
            ))}
          </SelectField>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1"
              loading={isPending}
            >
              {isPending ? "Agregando..." : "Agregar"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
