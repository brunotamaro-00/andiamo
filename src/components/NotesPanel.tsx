"use client";

import { useState, useTransition } from "react";
import { createNote, toggleNotePin, deleteNote } from "@/app/actions/notes";

interface Note {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  createdAt: Date;
}

interface NotesPanelProps {
  stopId: string | null;
  slug: string | null;
  notes: Note[];
  path: string;
}

export function NotesPanel({ stopId, slug, notes, path }: NotesPanelProps) {
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();

  const pinned = notes.filter((n) => n.pinned);
  const rest = notes.filter((n) => !n.pinned);
  const sorted = [...pinned, ...rest];

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Notas {notes.length > 0 && <span className="text-slate-600 normal-case">({notes.length})</span>}
        </h2>
        <button onClick={() => setOpen(true)} className="text-xs text-sky-400 hover:text-sky-300 transition-colors">
          + Agregar
        </button>
      </div>

      {sorted.length === 0 && (
        <p className="text-slate-600 text-sm">Sin notas. Agregá recordatorios importantes.</p>
      )}

      <div className="space-y-2">
        {sorted.map((note) => (
          <div
            key={note.id}
            className={`p-3 rounded-xl border ${note.pinned ? "border-amber-700/50 bg-amber-900/10" : "border-slate-800 bg-slate-800/30"}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  {note.pinned && <span className="text-amber-400 text-xs">📌</span>}
                  <p className="text-sm font-medium text-slate-200">{note.title}</p>
                </div>
                {note.body && <p className="text-xs text-slate-400 mt-1 whitespace-pre-wrap">{note.body}</p>}
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => startTransition(() => toggleNotePin(note.id, path))}
                  className={`text-xs p-1 rounded hover:bg-slate-700 transition-colors ${note.pinned ? "text-amber-400" : "text-slate-600 hover:text-amber-400"}`}
                  title={note.pinned ? "Quitar pin" : "Fijar"}
                >
                  📌
                </button>
                <button
                  onClick={() => startTransition(() => deleteNote(note.id, path))}
                  className="text-xs p-1 rounded hover:bg-slate-700 text-slate-600 hover:text-red-400 transition-colors"
                  title="Borrar"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {open && (
        <AddNoteModal stopId={stopId} slug={slug} path={path} onClose={() => setOpen(false)} />
      )}
    </div>
  );
}

function AddNoteModal({
  stopId, slug, path, onClose,
}: {
  stopId: string | null; slug: string | null; path: string; onClose: () => void;
}) {
  const [, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    if (stopId) formData.set("stopId", stopId);
    if (slug) formData.set("slug", slug);
    startTransition(() => {
      createNote(formData).then(onClose);
    });
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-slate-900 rounded-2xl p-5 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-100">Nueva nota</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">✕</button>
        </div>

        <form action={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-slate-400">Título</label>
            <input
              type="text"
              name="title"
              required
              className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500"
              placeholder="Ej: Hostel paga en cash"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400">Cuerpo</label>
            <textarea
              name="body"
              rows={3}
              className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
              placeholder="Detalles..."
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" name="pinned" value="true" className="rounded border-slate-600" />
            Fijar arriba
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
