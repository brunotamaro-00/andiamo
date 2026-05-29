"use client";

import { useState, useTransition } from "react";
import {
  BedDouble, Landmark, Target, UtensilsCrossed, Binoculars,
  TrainFront, MapPin, Check, Trash2, ExternalLink, Plus, Pencil,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { createPoi, updatePoi, togglePoiDone, deletePoi } from "@/app/actions/pois";
import { Card, SectionHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, SelectField } from "@/components/ui/Field";

const POI_TYPES = [
  "hostel", "museo", "actividad", "comida", "mirador", "transporte", "otro",
] as const;

const TYPE_ICON: Record<string, LucideIcon> = {
  hostel:     BedDouble,
  museo:      Landmark,
  actividad:  Target,
  comida:     UtensilsCrossed,
  mirador:    Binoculars,
  transporte: TrainFront,
  otro:       MapPin,
};

const TYPE_LABEL: Record<string, string> = {
  hostel: "Hostel / Hotel", museo: "Museo", actividad: "Actividad",
  comida: "Comida", mirador: "Mirador", transporte: "Transporte", otro: "Otro",
};

interface Poi {
  id: string;
  name: string;
  type: string;
  latitude: number;
  longitude: number;
  address: string | null;
  url: string | null;
  notes: string | null;
  done: boolean;
  reservationRequired: boolean;
}

interface PoiPanelProps {
  stopId: string;
  slug: string;
  pois: Poi[];
}

export function PoiPanel({ stopId, slug, pois }: PoiPanelProps) {
  const [open, setOpen] = useState(false);
  const [editingPoi, setEditingPoi] = useState<Poi | null>(null);
  const [, startTransition] = useTransition();

  const pending = pois.filter((p) => !p.done);
  const done = pois.filter((p) => p.done);
  const count = done.length > 0 ? `${done.length}/${pois.length}` : undefined;

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

      {pois.length === 0 && (
        <p className="text-sand-600 text-sm">
          Aún no hay POIs. Agregá el hostel y actividades.
        </p>
      )}

      <ul className="space-y-1">
        {[...pending, ...done].map((poi) => (
          <PoiItem
            key={poi.id}
            poi={poi}
            onToggle={() => startTransition(() => togglePoiDone(poi.id, slug))}
            onEdit={() => setEditingPoi(poi)}
            onDelete={() => startTransition(() => deletePoi(poi.id, slug))}
          />
        ))}
      </ul>

      {open && (
        <AddPoiModal stopId={stopId} slug={slug} onClose={() => setOpen(false)} />
      )}

      {editingPoi && (
        <EditPoiModal poi={editingPoi} slug={slug} onClose={() => setEditingPoi(null)} />
      )}
    </Card>
  );
}

function PoiItem({
  poi, onToggle, onEdit, onDelete,
}: {
  poi: Poi; onToggle: () => void; onEdit: () => void; onDelete: () => void;
}) {
  const Icon = TYPE_ICON[poi.type] ?? MapPin;

  return (
    <li
      className={`flex items-start gap-2 py-2.5 border-b border-sand-800 last:border-0 ${
        poi.done ? "opacity-50" : ""
      }`}
    >
      {/* Done toggle */}
      <button
        onClick={onToggle}
        aria-pressed={poi.done}
        aria-label={
          poi.done
            ? `Marcar "${poi.name}" como pendiente`
            : `Marcar "${poi.name}" como hecho`
        }
        className={[
          "mt-0.5 w-5 h-5 rounded-full border flex-shrink-0 flex items-center justify-center transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400",
          poi.done
            ? "bg-success border-success/60 text-success-bg"
            : "border-sand-600 hover:border-gold-400",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {poi.done && <Check size={11} strokeWidth={2.5} aria-hidden="true" />}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Icon
            size={13}
            strokeWidth={1.5}
            aria-hidden="true"
            className="text-sand-500 shrink-0"
          />
          <span
            className={`text-sm font-medium ${
              poi.done ? "line-through text-sand-600" : "text-sand-100"
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
          <p className="text-xs text-sand-500 mt-0.5 truncate">{poi.address}</p>
        )}
        {poi.notes && (
          <p className="text-xs text-sand-500 mt-0.5">{poi.notes}</p>
        )}
        {poi.url && (
          <a
            href={poi.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gold-400 hover:text-gold-300 inline-flex items-center gap-0.5 mt-0.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold-400 rounded"
            aria-label={`Ver ${poi.name} (abre en nueva pestaña)`}
          >
            Ver
            <ExternalLink size={11} strokeWidth={1.5} aria-hidden="true" />
          </a>
        )}
      </div>

      {/* Maps link */}
      <a
        href={`https://www.google.com/maps/search/?api=1&query=${poi.latitude},${poi.longitude}`}
        target="_blank"
        rel="noopener noreferrer"
        className="p-1.5 rounded-lg text-sand-600 hover:text-sand-300 hover:bg-sand-850 transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400"
        aria-label={`Abrir ${poi.name} en Google Maps`}
      >
        <MapPin size={14} strokeWidth={1.5} aria-hidden="true" />
      </a>

      {/* Edit */}
      <button
        onClick={onEdit}
        aria-label={`Editar "${poi.name}"`}
        className="p-1.5 rounded-lg text-sand-600 hover:text-gold-400 hover:bg-sand-850 transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400"
      >
        <Pencil size={14} strokeWidth={1.5} aria-hidden="true" />
      </button>

      {/* Delete */}
      <button
        onClick={onDelete}
        aria-label={`Borrar "${poi.name}"`}
        className="p-1.5 rounded-lg text-sand-700 hover:text-danger hover:bg-danger-bg transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400"
      >
        <Trash2 size={14} strokeWidth={1.5} aria-hidden="true" />
      </button>
    </li>
  );
}

function PoiForm({
  defaults,
  onSubmit,
  onClose,
}: {
  defaults?: Partial<Poi>;
  onSubmit: (formData: FormData) => void;
  onClose: () => void;
}) {
  return (
    <form action={onSubmit} className="space-y-3">
      <Field
        label="Nombre"
        name="name"
        required
        placeholder="Ej: Hostel Generator"
        defaultValue={defaults?.name ?? ""}
      />

      <SelectField label="Tipo" name="type" defaultValue={defaults?.type ?? "otro"}>
        {POI_TYPES.map((t) => (
          <option key={t} value={t}>
            {TYPE_LABEL[t]}
          </option>
        ))}
      </SelectField>

      <div className="grid grid-cols-2 gap-2">
        <Field
          label="Latitud"
          name="latitude"
          required
          placeholder="48.8566"
          type="number"
          step="any"
          defaultValue={defaults?.latitude?.toString() ?? ""}
        />
        <Field
          label="Longitud"
          name="longitude"
          required
          placeholder="2.3522"
          type="number"
          step="any"
          defaultValue={defaults?.longitude?.toString() ?? ""}
        />
      </div>

      <Field
        label="Dirección (opcional)"
        name="address"
        placeholder="Calle, número..."
        defaultValue={defaults?.address ?? ""}
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

      <label className="flex items-center gap-2 text-sm text-sand-300 cursor-pointer">
        <input
          type="checkbox"
          name="reservationRequired"
          value="true"
          defaultChecked={defaults?.reservationRequired ?? false}
          className="rounded border-sand-600 accent-gold-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400"
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
  stopId, slug, onClose,
}: {
  stopId: string; slug: string; onClose: () => void;
}) {
  const [, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    formData.set("stopId", stopId);
    formData.set("slug", slug);
    startTransition(() => {
      createPoi(formData).then(onClose);
    });
  }

  return (
    <Modal title="Agregar punto de interés" onClose={onClose}>
      <PoiForm onSubmit={handleSubmit} onClose={onClose} />
    </Modal>
  );
}

function EditPoiModal({
  poi, slug, onClose,
}: {
  poi: Poi; slug: string; onClose: () => void;
}) {
  const [, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    formData.set("slug", slug);
    startTransition(() => {
      updatePoi(poi.id, formData).then(onClose);
    });
  }

  return (
    <Modal title="Editar punto de interés" onClose={onClose}>
      <PoiForm defaults={poi} onSubmit={handleSubmit} onClose={onClose} />
    </Modal>
  );
}
