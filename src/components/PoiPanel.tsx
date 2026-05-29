"use client";

import { useState, useTransition } from "react";
import { createPoi, togglePoiDone, deletePoi } from "@/app/actions/pois";

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

const POI_TYPES = ["hostel", "museo", "actividad", "comida", "mirador", "transporte", "otro"] as const;

const TYPE_EMOJI: Record<string, string> = {
  hostel: "🏨", museo: "🏛️", actividad: "🎯", comida: "🍽️",
  mirador: "🔭", transporte: "🚂", otro: "📍",
};

interface PoiPanelProps {
  stopId: string;
  slug: string;
  pois: Poi[];
}

export function PoiPanel({ stopId, slug, pois }: PoiPanelProps) {
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();

  const pending = pois.filter((p) => !p.done);
  const done = pois.filter((p) => p.done);

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Puntos de interés
          {pois.length > 0 && (
            <span className="ml-2 text-slate-600 normal-case">
              {done.length}/{pois.length}
            </span>
          )}
        </h2>
        <button
          onClick={() => setOpen(true)}
          className="text-xs text-sky-400 hover:text-sky-300 transition-colors"
        >
          + Agregar
        </button>
      </div>

      {pois.length === 0 && (
        <p className="text-slate-600 text-sm">Aún no hay POIs. Agregá el hostel y actividades.</p>
      )}

      <ul className="space-y-2">
        {[...pending, ...done].map((poi) => (
          <PoiItem
            key={poi.id}
            poi={poi}
            slug={slug}
            onToggle={() => startTransition(() => togglePoiDone(poi.id, slug))}
            onDelete={() => startTransition(() => deletePoi(poi.id, slug))}
          />
        ))}
      </ul>

      {open && (
        <AddPoiModal
          stopId={stopId}
          slug={slug}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

function PoiItem({
  poi, slug, onToggle, onDelete,
}: {
  poi: Poi; slug: string; onToggle: () => void; onDelete: () => void;
}) {
  return (
    <li className={`flex items-start gap-2 py-2 border-b border-slate-800 last:border-0 ${poi.done ? "opacity-50" : ""}`}>
      <button
        onClick={onToggle}
        className={`mt-0.5 w-5 h-5 rounded-full border flex-shrink-0 flex items-center justify-center transition-colors ${
          poi.done ? "bg-emerald-600 border-emerald-600 text-white" : "border-slate-600 hover:border-sky-500"
        }`}
      >
        {poi.done && <span className="text-xs">✓</span>}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">{TYPE_EMOJI[poi.type] ?? "📍"}</span>
          <span className={`text-sm font-medium ${poi.done ? "line-through text-slate-500" : "text-slate-200"}`}>
            {poi.name}
          </span>
          {poi.reservationRequired && !poi.done && (
            <span className="text-[10px] bg-red-900/50 text-red-400 rounded px-1">reservar</span>
          )}
        </div>
        {poi.address && <p className="text-xs text-slate-500 mt-0.5 truncate">{poi.address}</p>}
        {poi.notes && <p className="text-xs text-slate-500 mt-0.5">{poi.notes}</p>}
        {poi.url && (
          <a href={poi.url} target="_blank" rel="noopener noreferrer" className="text-xs text-sky-500 hover:text-sky-400">
            Ver ↗
          </a>
        )}
      </div>

      <a
        href={`https://www.google.com/maps/search/?api=1&query=${poi.latitude},${poi.longitude}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-slate-600 hover:text-sky-400 text-xs shrink-0 mt-0.5"
        title="Abrir en Maps"
      >
        🗺️
      </a>

      <button
        onClick={onDelete}
        className="text-slate-700 hover:text-red-400 text-xs shrink-0 mt-0.5 ml-1"
        title="Borrar"
      >
        ✕
      </button>
    </li>
  );
}

function AddPoiModal({ stopId, slug, onClose }: { stopId: string; slug: string; onClose: () => void }) {
  const [, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    formData.set("stopId", stopId);
    formData.set("slug", slug);
    startTransition(() => {
      createPoi(formData).then(onClose);
    });
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-slate-900 rounded-2xl p-5 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-100">Agregar punto de interés</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">✕</button>
        </div>

        <form action={handleSubmit} className="space-y-3">
          <Field label="Nombre" name="name" required placeholder="Ej: Hostel Generator" />

          <div>
            <label className="text-xs text-slate-400">Tipo</label>
            <select name="type" className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500">
              {POI_TYPES.map((t) => (
                <option key={t} value={t}>{TYPE_EMOJI[t]} {t}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Latitud" name="latitude" required placeholder="48.8566" type="number" step="any" />
            <Field label="Longitud" name="longitude" required placeholder="2.3522" type="number" step="any" />
          </div>

          <Field label="Dirección (opcional)" name="address" placeholder="Calle, número..." />
          <Field label="Link (opcional)" name="url" type="url" placeholder="https://..." />
          <Field label="Notas (opcional)" name="notes" placeholder="Ej: Pagar 50% en cash" />

          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" name="reservationRequired" value="true" className="rounded border-slate-600" />
            Requiere reserva
          </label>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border border-slate-700 text-slate-400 text-sm hover:border-slate-500 transition-colors">
              Cancelar
            </button>
            <button type="submit" className="flex-1 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium transition-colors">
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label, name, required, placeholder, type = "text", step,
}: {
  label: string; name: string; required?: boolean; placeholder?: string; type?: string; step?: string;
}) {
  return (
    <div>
      <label className="text-xs text-slate-400">{label}</label>
      <input
        type={type}
        name={name}
        required={required}
        placeholder={placeholder}
        step={step}
        className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500"
      />
    </div>
  );
}
