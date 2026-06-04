"use client";

import { useState, useTransition, useOptimistic, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  BedDouble, Landmark, Target, UtensilsCrossed, Binoculars,
  TrainFront, MapPin, Check, Trash2, ExternalLink, Plus, Pencil, X, Search, AlertCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { createPoi, updatePoi, togglePoiDone, deletePoi } from "@/app/actions/pois";
import { Card, SectionHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, SelectField } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/EmptyState";

const POI_TYPES = [
  "hospedaje", "museo", "actividad", "comida", "mirador", "transporte", "otro",
] as const;

const TYPE_ICON: Record<string, LucideIcon> = {
  hospedaje:  BedDouble,
  museo:      Landmark,
  actividad:  Target,
  comida:     UtensilsCrossed,
  mirador:    Binoculars,
  transporte: TrainFront,
  otro:       MapPin,
};

const TYPE_LABEL: Record<string, string> = {
  hospedaje: "Hospedaje", museo: "Museo", actividad: "Actividad",
  comida: "Comida", mirador: "Mirador", transporte: "Transporte", otro: "Otro",
};

/** Shared 40px touch target for secondary row actions. */
const actionBtn =
  "h-10 w-10 flex items-center justify-center rounded-lg transition-all " +
  "active:scale-90 motion-reduce:active:scale-100 shrink-0 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral";

interface Poi {
  id: string;
  name: string;
  type: string;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  url: string | null;
  notes: string | null;
  done: boolean;
  reservationRequired: boolean;
}

interface PoiPanelProps {
  stopId: string;
  slug: string;
  stopLat: number;
  stopLng: number;
  pois: Poi[];
}

type OptimisticAction =
  | { type: "toggle"; id: string }
  | { type: "delete"; id: string }
  | { type: "add"; poi: Poi };

export function PoiPanel({ stopId, slug, stopLat, stopLng, pois }: PoiPanelProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editingPoi, setEditingPoi] = useState<Poi | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [optimisticPois, applyOptimistic] = useOptimistic(
    pois,
    (state, action: OptimisticAction) => {
      switch (action.type) {
        case "toggle":
          return state.map((p) =>
            p.id === action.id ? { ...p, done: !p.done } : p
          );
        case "delete":
          return state.filter((p) => p.id !== action.id);
        case "add":
          return [...state, action.poi];
      }
    }
  );

  function handleToggle(poi: Poi) {
    setMutationError(null);
    startTransition(async () => {
      applyOptimistic({ type: "toggle", id: poi.id });
      try {
        await togglePoiDone(poi.id, slug);
      } catch {
        setMutationError("No se pudo guardar el cambio. Reintentá.");
        router.refresh();
      }
    });
  }

  function handleDelete(id: string) {
    setConfirmingId(null);
    setMutationError(null);
    startTransition(async () => {
      applyOptimistic({ type: "delete", id });
      try {
        await deletePoi(id, slug);
      } catch {
        setMutationError("No se pudo borrar. Reintentá.");
        router.refresh();
      }
    });
  }

  function handleAdd(formData: FormData) {
    formData.set("stopId", stopId);
    formData.set("slug", slug);
    const latRaw = formData.get("latitude") as string;
    const lngRaw = formData.get("longitude") as string;
    const temp: Poi = {
      id: `temp-${Date.now()}`,
      name: (formData.get("name") as string) || "—",
      type: (formData.get("type") as string) || "otro",
      latitude: latRaw ? parseFloat(latRaw) : null,
      longitude: lngRaw ? parseFloat(lngRaw) : null,
      address: (formData.get("address") as string) || null,
      url: (formData.get("url") as string) || null,
      notes: (formData.get("notes") as string) || null,
      done: false,
      reservationRequired: formData.get("reservationRequired") === "true",
    };
    setOpen(false);
    setMutationError(null);
    startTransition(async () => {
      applyOptimistic({ type: "add", poi: temp });
      try {
        await createPoi(formData);
      } catch {
        setMutationError("No se pudo agregar el punto de interés. Reintentá.");
        router.refresh();
      }
    });
  }

  function handleEdit(formData: FormData, id: string) {
    formData.set("slug", slug);
    setEditingPoi(null);
    setMutationError(null);
    startTransition(async () => {
      try {
        await updatePoi(id, formData);
      } catch {
        setMutationError("No se pudo guardar los cambios. Reintentá.");
        router.refresh();
      }
    });
  }

  const pending = optimisticPois.filter((p) => !p.done);
  const done = optimisticPois.filter((p) => p.done);
  const count =
    done.length > 0 ? `${done.length}/${optimisticPois.length}` : undefined;

  return (
    <Card>
      <SectionHeader
        title="Puntos de interés"
        count={count}
        action={
          <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
            <Plus size={13} strokeWidth={1.5} aria-hidden="true" />
            Agregar
          </Button>
        }
      />

      {mutationError && (
        <p className="text-xs text-danger flex items-center gap-1.5 mb-2" role="alert">
          <AlertCircle size={12} strokeWidth={1.5} aria-hidden="true" className="shrink-0" />
          {mutationError}
        </p>
      )}

      {optimisticPois.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="Sin puntos de interés"
          description="Agregá el hospedaje, actividades y lugares para comer."
          action={
            <Button variant="primary" size="sm" onClick={() => setOpen(true)}>
              <Plus size={13} strokeWidth={1.5} aria-hidden="true" />
              Agregar el primero
            </Button>
          }
        />
      ) : (
        <ul
          className={`space-y-1 transition-opacity ${isPending ? "opacity-70" : ""}`}
        >
          {[...pending, ...done].map((poi) => (
            <PoiItem
              key={poi.id}
              poi={poi}
              confirming={confirmingId === poi.id}
              onToggle={() => handleToggle(poi)}
              onEdit={() => setEditingPoi(poi)}
              onRequestDelete={() => setConfirmingId(poi.id)}
              onCancelDelete={() => setConfirmingId(null)}
              onConfirmDelete={() => handleDelete(poi.id)}
            />
          ))}
        </ul>
      )}

      {open && (
        <AddPoiModal
          stopLat={stopLat}
          stopLng={stopLng}
          onSubmit={handleAdd}
          onClose={() => setOpen(false)}
        />
      )}

      {editingPoi && (
        <EditPoiModal
          poi={editingPoi}
          stopLat={stopLat}
          stopLng={stopLng}
          onSubmit={(fd) => handleEdit(fd, editingPoi.id)}
          onClose={() => setEditingPoi(null)}
        />
      )}
    </Card>
  );
}

function PoiItem({
  poi, confirming, onToggle, onEdit, onRequestDelete, onCancelDelete, onConfirmDelete,
}: {
  poi: Poi;
  confirming: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onRequestDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
}) {
  const Icon = TYPE_ICON[poi.type] ?? MapPin;
  const hasCoords = poi.latitude != null && poi.longitude != null;

  return (
    <li
      className={`flex items-start gap-1 py-1.5 border-b border-border last:border-0 ${
        poi.done ? "opacity-50" : ""
      }`}
    >
      {/* Done toggle — 44px touch target */}
      <button
        onClick={onToggle}
        aria-pressed={poi.done}
        aria-label={
          poi.done
            ? `Marcar "${poi.name}" como pendiente`
            : `Marcar "${poi.name}" como hecho`
        }
        className="group mt-0.5 h-11 w-11 flex items-center justify-center rounded-full shrink-0 transition-transform active:scale-90 motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral"
      >
        <span
          className={[
            "w-5 h-5 rounded-full border flex items-center justify-center transition-colors",
            poi.done
              ? "bg-success border-success/60 text-success-bg"
              : "border-ink-3 group-hover:border-coral",
          ].join(" ")}
        >
          {poi.done && <Check size={11} strokeWidth={2.5} aria-hidden="true" />}
        </span>
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0 pt-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Icon
            size={13}
            strokeWidth={1.5}
            aria-hidden="true"
            className="text-ink-3 shrink-0"
          />
          <span
            className={`text-sm font-medium ${
              poi.done ? "line-through text-ink-faint" : "text-ink"
            }`}
          >
            {poi.name}
          </span>
          {poi.reservationRequired && !poi.done && (
            <span className="text-[10px] bg-danger-bg text-danger rounded-lg px-1.5 py-0.5 border border-danger/30">
              reservar
            </span>
          )}
        </div>
        {poi.address && (
          <p className="text-xs text-ink-3 mt-0.5 truncate">{poi.address}</p>
        )}
        {poi.notes && (
          <p className="text-xs text-ink-3 mt-0.5">{poi.notes}</p>
        )}
        {poi.url && (
          <a
            href={poi.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-coral hover:text-coral-hover inline-flex items-center gap-0.5 mt-0.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-coral rounded"
            aria-label={`Ver ${poi.name} (abre en nueva pestaña)`}
          >
            Ver
            <ExternalLink size={11} strokeWidth={1.5} aria-hidden="true" />
          </a>
        )}
      </div>

      {/* Actions / inline delete confirmation */}
      {confirming ? (
        <div className="flex items-center gap-1 pt-1.5 shrink-0">
          <span className="text-xs text-danger mr-1">¿Borrar?</span>
          <button
            onClick={onConfirmDelete}
            aria-label={`Confirmar borrado de "${poi.name}"`}
            className={`${actionBtn} text-danger hover:bg-danger-bg`}
          >
            <Check size={16} strokeWidth={2} aria-hidden="true" />
          </button>
          <button
            onClick={onCancelDelete}
            aria-label="Cancelar borrado"
            className={`${actionBtn} text-ink-2 hover:bg-surface-2`}
          >
            <X size={16} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
      ) : (
        <div className="flex items-center pt-1.5 shrink-0">
          {hasCoords ? (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${poi.latitude},${poi.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`${actionBtn} text-ink-3 hover:text-ink-2 hover:bg-surface-2`}
              aria-label={`Abrir ${poi.name} en Google Maps`}
            >
              <MapPin size={16} strokeWidth={1.5} aria-hidden="true" />
            </a>
          ) : (
            <span className={`${actionBtn} text-border cursor-default`} aria-hidden="true">
              <MapPin size={16} strokeWidth={1.5} />
            </span>
          )}
          <button
            onClick={onEdit}
            aria-label={`Editar "${poi.name}"`}
            className={`${actionBtn} text-ink-3 hover:text-coral hover:bg-surface-2`}
          >
            <Pencil size={16} strokeWidth={1.5} aria-hidden="true" />
          </button>
          <button
            onClick={onRequestDelete}
            aria-label={`Borrar "${poi.name}"`}
            className={`${actionBtn} text-ink-3 hover:text-danger hover:bg-danger-bg`}
          >
            <Trash2 size={16} strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>
      )}
    </li>
  );
}

/* ─── Place search field ──────────────────────────────────────────────────── */

interface PlaceCoords {
  lat: number;
  lng: number;
}

interface PlaceSelection {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

interface PlaceSearchFieldProps {
  stopLat: number;
  stopLng: number;
  /** Pre-populated selection for edit mode. */
  initialCoords?: PlaceCoords | null;
  initialLabel?: string;
  onSelect: (result: PlaceSelection) => void;
  onClear: () => void;
}

function PlaceSearchField({
  stopLat, stopLng, initialCoords, initialLabel, onSelect, onClear,
}: PlaceSearchFieldProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceSelection[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<PlaceCoords | null>(initialCoords ?? null);
  const [selectedLabel, setSelectedLabel] = useState(initialLabel ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleQueryChange(val: string) {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const url = `/api/places?q=${encodeURIComponent(val)}&lat=${stopLat}&lng=${stopLng}`;
        const res = await fetch(url);
        const data = await res.json();
        // API returns { latitude, longitude } — map to { lat, lng } for local state
        setResults(
          (data.results ?? []).map((r: { name: string; address: string; latitude: number; longitude: number }) => ({
            name: r.name,
            address: r.address,
            lat: r.latitude,
            lng: r.longitude,
          }))
        );
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
  }

  function handleSelect(r: PlaceSelection) {
    setSelected({ lat: r.lat, lng: r.lng });
    setSelectedLabel(r.address || r.name);
    setQuery("");
    setResults([]);
    onSelect(r);
  }

  function handleClear() {
    setSelected(null);
    setSelectedLabel("");
    setQuery("");
    setResults([]);
    onClear();
  }

  const inputClass =
    "mt-1 w-full bg-surface-2 border border-border-strong rounded-xl px-3 py-2.5 text-sm text-ink " +
    "placeholder:text-ink-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-coral " +
    "focus-visible:ring-offset-2 focus-visible:ring-offset-canvas transition-colors";

  return (
    <div>
      <span className="text-xs font-medium text-ink-2">Ubicación (opcional)</span>

      {/* Hidden coord inputs always present — empty string if no selection */}
      <input type="hidden" name="latitude" value={selected?.lat ?? ""} />
      <input type="hidden" name="longitude" value={selected?.lng ?? ""} />

      {selected ? (
        /* Chip showing selected place */
        <div className="mt-1 flex items-center gap-2 px-3 py-2 bg-coral-bg border border-coral-border/40 rounded-[4px]">
          <MapPin size={13} strokeWidth={1.5} aria-hidden="true" className="text-coral shrink-0" />
          <span className="text-sm text-coral-ink flex-1 truncate">{selectedLabel}</span>
          <button
            type="button"
            onClick={handleClear}
            aria-label="Quitar ubicación seleccionada"
            className="p-1 rounded-lg text-ink-3 hover:text-ink hover:bg-surface-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral"
          >
            <X size={14} strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>
      ) : (
        <>
          {/* Search input */}
          <div className="relative mt-1">
            <Search
              size={15}
              strokeWidth={1.5}
              aria-hidden="true"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="Buscar lugar, museo, hospedaje..."
              aria-label="Buscar ubicación del punto de interés"
              className={`${inputClass} pl-9`}
            />
          </div>

          {searching && (
            <p className="text-xs text-ink-3 mt-1">Buscando...</p>
          )}

          <p className="sr-only" role="status" aria-live="polite">
            {searching
              ? "Buscando lugares"
              : results.length > 0
              ? `${results.length} lugares encontrados`
              : query.length >= 2
              ? "Sin resultados"
              : ""}
          </p>

          {/* Results list */}
          {results.length > 0 && (
            <div className="mt-1 space-y-1">
              {results.map((r, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelect(r)}
                  className="w-full text-left px-3 py-2 rounded-[4px] bg-surface-2 hover:bg-border transition-colors border border-border hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral"
                >
                  <p className="text-sm font-medium text-ink truncate">{r.name}</p>
                  <p className="text-xs text-ink-3 truncate">{r.address}</p>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ─── PoiForm ─────────────────────────────────────────────────────────────── */

function PoiForm({
  defaults,
  stopLat,
  stopLng,
  onSubmit,
  onClose,
}: {
  defaults?: Partial<Poi>;
  stopLat: number;
  stopLng: number;
  onSubmit: (formData: FormData) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(defaults?.name ?? "");
  const [address, setAddress] = useState(defaults?.address ?? "");

  const initialCoords =
    defaults?.latitude != null && defaults?.longitude != null
      ? { lat: defaults.latitude, lng: defaults.longitude }
      : null;
  const initialLabel = defaults?.address ?? defaults?.name ?? "";

  function handlePlaceSelect(result: { name: string; address: string; lat: number; lng: number }) {
    setAddress(result.address);
    setName((prev) => prev.trim() ? prev : result.name);
  }

  function handlePlaceClear() {
    setAddress("");
  }

  return (
    <form action={onSubmit} className="space-y-3">
      <Field
        label="Nombre"
        name="name"
        required
        placeholder="Ej: Victoria Villa Airbnb"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <SelectField label="Tipo" name="type" defaultValue={defaults?.type ?? "otro"}>
        {POI_TYPES.map((t) => (
          <option key={t} value={t}>
            {TYPE_LABEL[t]}
          </option>
        ))}
      </SelectField>

      <PlaceSearchField
        stopLat={stopLat}
        stopLng={stopLng}
        initialCoords={initialCoords}
        initialLabel={initialLabel}
        onSelect={handlePlaceSelect}
        onClear={handlePlaceClear}
      />

      <Field
        label="Dirección (opcional)"
        name="address"
        placeholder="Calle, número..."
        value={address}
        onChange={(e) => setAddress(e.target.value)}
      />
      <Field
        label="Link (opcional)"
        name="url"
        type="url"
        placeholder="https://..."
        defaultValue={defaults?.url ?? ""}
      />
      <Field
        label="Notas (opcional)"
        name="notes"
        placeholder="Ej: Pagar 50% en cash"
        defaultValue={defaults?.notes ?? ""}
      />

      <label className="flex items-center gap-2 text-sm text-ink-2 cursor-pointer">
        <input
          type="checkbox"
          name="reservationRequired"
          value="true"
          defaultChecked={defaults?.reservationRequired ?? false}
          className="rounded border-ink-faint accent-coral focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral"
        />
        Requiere reserva
      </label>

      <div className="flex gap-2 pt-1">
        <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" className="flex-1">
          Guardar
        </Button>
      </div>
    </form>
  );
}

function AddPoiModal({
  stopLat, stopLng, onSubmit, onClose,
}: {
  stopLat: number;
  stopLng: number;
  onSubmit: (formData: FormData) => void;
  onClose: () => void;
}) {
  return (
    <Modal title="Agregar punto de interés" onClose={onClose}>
      <PoiForm stopLat={stopLat} stopLng={stopLng} onSubmit={onSubmit} onClose={onClose} />
    </Modal>
  );
}

function EditPoiModal({
  poi, stopLat, stopLng, onSubmit, onClose,
}: {
  poi: Poi;
  stopLat: number;
  stopLng: number;
  onSubmit: (formData: FormData) => void;
  onClose: () => void;
}) {
  return (
    <Modal title="Editar punto de interés" onClose={onClose}>
      <PoiForm defaults={poi} stopLat={stopLat} stopLng={stopLng} onSubmit={onSubmit} onClose={onClose} />
    </Modal>
  );
}
