"use client";

import { useState, useRef } from "react";
import {
  BedDouble, Landmark, Target, UtensilsCrossed, Binoculars,
  TrainFront, MapPin, Trash2, ExternalLink, Plus, Pencil, X, Search, Copy,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { PoiCheck } from "@/components/ui/PoiCheck";
import { InlineDeleteConfirm } from "@/components/ui/InlineDeleteConfirm";
import { MutationErrorBanner } from "@/components/ui/MutationErrorBanner";
import { rowActionBtn as actionBtn } from "@/components/ui/row-action";
import type { LucideIcon } from "lucide-react";
import { createPoi, updatePoi, togglePoiDone, deletePoi } from "@/app/actions/pois";
import { haptics } from "@/lib/haptics";
import { useOptimisticList } from "@/lib/use-optimistic-list";
import { Card, SectionHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, SelectField, inputClass } from "@/components/ui/Field";
import { Label } from "@/components/ui/Label";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";

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
  const [open, setOpen] = useState(false);
  const [editingPoi, setEditingPoi] = useState<Poi | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const { toast } = useToast();

  const { items: optimisticPois, mutate, run, mutationError, isPending } = useOptimisticList(
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
    if (poi.done) haptics.tap(); else haptics.success();
    mutate({ type: "toggle", id: poi.id }, () => togglePoiDone(poi.id, slug), "No se pudo guardar el cambio. Reintentá.");
  }

  const detailPoi = detailId ? optimisticPois.find((p) => p.id === detailId) ?? null : null;

  function handleDelete(id: string) {
    setDetailId(null);
    haptics.warning();
    mutate({ type: "delete", id }, () => deletePoi(id, slug), "No se pudo borrar. Reintentá.", () => toast("Punto borrado"));
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
    haptics.success();
    mutate({ type: "add", poi: temp }, () => createPoi(formData), "No se pudo agregar el punto de interés. Reintentá.", () => toast("Punto agregado"));
  }

  function handleEdit(formData: FormData, id: string) {
    formData.set("slug", slug);
    setEditingPoi(null);
    run(() => updatePoi(id, formData), "No se pudo guardar los cambios. Reintentá.", () => toast("Cambios guardados"));
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

      <MutationErrorBanner message={mutationError} />

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
              onToggle={() => handleToggle(poi)}
              onOpen={() => setDetailId(poi.id)}
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

      {detailPoi && (
        <PoiDetailModal
          poi={detailPoi}
          onEdit={() => {
            const p = detailPoi;
            setDetailId(null);
            setEditingPoi(p);
          }}
          onDelete={() => handleDelete(detailPoi.id)}
          onClose={() => setDetailId(null)}
        />
      )}
    </Card>
  );
}

function PoiItem({
  poi, onToggle, onOpen,
}: {
  poi: Poi;
  onToggle: () => void;
  onOpen: () => void;
}) {
  const Icon = TYPE_ICON[poi.type] ?? MapPin;
  const hasCoords = poi.latitude != null && poi.longitude != null;

  return (
    <li
      className={`py-1.5 border-b border-border last:border-0 ${
        poi.done ? "opacity-50" : ""
      }`}
    >
      {/* Only the maps pin stays inline; tapping the name opens the detail sheet. */}
      <div className="flex items-center gap-1">
        {/* Done toggle — 44px touch target */}
        <button
          onClick={onToggle}
          aria-pressed={poi.done}
          aria-label={
            poi.done
              ? `Marcar "${poi.name}" como pendiente`
              : `Marcar "${poi.name}" como hecho`
          }
          className="group h-11 w-11 flex items-center justify-center rounded-full shrink-0 transition-transform active:scale-90 motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick"
        >
          <PoiCheck done={poi.done} hover />
        </button>

        {/* Name — opens the detail sheet */}
        <button
          onClick={onOpen}
          aria-label={`Ver detalle de "${poi.name}"`}
          className="flex-1 min-w-0 flex items-center gap-1.5 text-left rounded-lg px-1 py-1.5 -my-1.5 transition-colors hover:bg-surface-2/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick"
        >
          <Icon
            size={13}
            strokeWidth={1.5}
            aria-hidden="true"
            className="text-ink-3 shrink-0"
          />
          <span
            className={`text-sm font-medium truncate ${
              poi.done ? "line-through text-ink-faint" : "text-ink"
            }`}
          >
            {poi.name}
          </span>
          {poi.reservationRequired && !poi.done && (
            <Badge variant="danger" className="shrink-0">Reservar</Badge>
          )}
        </button>

        <div className="flex items-center shrink-0">
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
        </div>
      </div>

      {(poi.address || poi.notes) && (
        <div className="pl-12 pr-1">
          {poi.address && (
            <p className="text-xs text-ink-3 truncate">{poi.address}</p>
          )}
          {poi.notes && (
            <p className="text-xs text-ink-3 mt-0.5">{poi.notes}</p>
          )}
        </div>
      )}
    </li>
  );
}

/** Per-POI detail sheet: copy address, open link, edit or delete. Keeps the
 *  row itself minimal (name + maps pin). */
function PoiDetailModal({
  poi, onEdit, onDelete, onClose,
}: {
  poi: Poi;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const { toast } = useToast();
  const Icon = TYPE_ICON[poi.type] ?? MapPin;
  const hasCoords = poi.latitude != null && poi.longitude != null;

  async function copyAddress() {
    if (!poi.address) return;
    try {
      await navigator.clipboard.writeText(poi.address);
      haptics.tap();
      toast("Dirección copiada");
    } catch {
      toast("No se pudo copiar", "error");
    }
  }

  return (
    <Modal title="Punto de interés" onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <span className="grid place-items-center h-11 w-11 rounded-lg bg-surface-2 text-ink-3 shrink-0">
            <Icon size={20} strokeWidth={1.5} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-base font-semibold text-ink">{poi.name}</p>
            <p className="text-xs text-ink-2">
              {TYPE_LABEL[poi.type] ?? poi.type}
              {poi.reservationRequired ? " · Requiere reserva" : ""}
            </p>
          </div>
        </div>

        {(poi.address || poi.notes) && (
          <div className="space-y-1">
            {poi.address && <p className="text-sm text-ink-2">{poi.address}</p>}
            {poi.notes && <p className="text-sm text-ink-3">{poi.notes}</p>}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {hasCoords && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${poi.latitude},${poi.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink px-3 py-2 text-[11px] font-extrabold uppercase tracking-[0.08em] text-ink min-h-[44px] transition-colors duration-150 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick/40"
            >
              <MapPin size={13} strokeWidth={2} aria-hidden="true" />
              Maps
            </a>
          )}
          {poi.url && (
            <a
              href={poi.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink px-3 py-2 text-[11px] font-extrabold uppercase tracking-[0.08em] text-ink min-h-[44px] transition-colors duration-150 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick/40"
            >
              <ExternalLink size={13} strokeWidth={2} aria-hidden="true" />
              Link
            </a>
          )}
          {poi.address && (
            <button
              type="button"
              onClick={copyAddress}
              className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink px-3 py-2 text-[11px] font-extrabold uppercase tracking-[0.08em] text-ink min-h-[44px] transition-colors duration-150 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick/40"
            >
              <Copy size={13} strokeWidth={2} aria-hidden="true" />
              Copiar
            </button>
          )}
        </div>

        {confirming ? (
          <InlineDeleteConfirm label={poi.name} onConfirm={onDelete} onCancel={() => setConfirming(false)} />
        ) : (
          <div className="flex gap-2 border-t border-border pt-3">
            <Button type="button" variant="secondary" className="flex-1" onClick={onEdit}>
              <Pencil size={14} strokeWidth={1.5} aria-hidden="true" />
              Editar
            </Button>
            <Button type="button" variant="danger" className="flex-1" onClick={() => setConfirming(true)}>
              <Trash2 size={14} strokeWidth={1.5} aria-hidden="true" />
              Borrar
            </Button>
          </div>
        )}
      </div>
    </Modal>
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
        if (!res.ok) throw new Error(`places ${res.status}`);
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

  return (
    <div>
      <Label as="span">Ubicación (opcional)</Label>

      {/* Hidden coord inputs always present — empty string if no selection */}
      <input type="hidden" name="latitude" value={selected?.lat ?? ""} />
      <input type="hidden" name="longitude" value={selected?.lng ?? ""} />

      {selected ? (
        /* Chip showing selected place */
        <div className="mt-1 flex items-center gap-2 px-3 py-2 bg-brick-bg border border-brick-border/40 rounded-lg">
          <MapPin size={13} strokeWidth={1.5} aria-hidden="true" className="text-brick shrink-0" />
          <span className="text-sm text-brick-ink flex-1 truncate">{selectedLabel}</span>
          <button
            type="button"
            onClick={handleClear}
            aria-label="Quitar ubicación seleccionada"
            className="h-11 w-11 -my-2 flex items-center justify-center rounded-lg text-ink-3 hover:text-ink hover:bg-surface-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick"
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
                  className="w-full text-left px-3 py-2 rounded-lg bg-surface-2 hover:bg-border transition-colors border border-border hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick"
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

export function PoiForm({
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
          className="rounded border-ink-faint accent-brick focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick"
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
