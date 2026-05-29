"use client";

import { useState, useTransition } from "react";
import { Pin, Trash2, Plus, Pencil } from "lucide-react";
import { createNote, toggleNotePin, deleteNote, updateNote } from "@/app/actions/notes";
import { Card, SectionHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, TextareaField } from "@/components/ui/Field";

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
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [, startTransition] = useTransition();

  const pinned = notes.filter((n) => n.pinned);
  const rest = notes.filter((n) => !n.pinned);
  const sorted = [...pinned, ...rest];

  return (
    <Card>
      <SectionHeader
        title="Notas"
        count={notes.length > 0 ? notes.length : undefined}
        action={
          <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
            <Plus size={13} strokeWidth={1.5} aria-hidden="true" />
            Agregar
          </Button>
        }
      />

      {sorted.length === 0 && (
        <p className="text-sand-600 text-sm">
          Sin notas. Agregá recordatorios importantes.
        </p>
      )}

      <div className="space-y-2">
        {sorted.map((note) => (
          <div
            key={note.id}
            className={`p-3 rounded-xl border ${
              note.pinned
                ? "border-warning/30 bg-warning-bg/40"
                : "border-sand-800 bg-sand-850/30"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  {note.pinned && (
                    <Pin
                      size={12}
                      strokeWidth={1.5}
                      aria-hidden="true"
                      className="text-warning shrink-0"
                    />
                  )}
                  <p className="text-sm font-medium text-sand-200">{note.title}</p>
                </div>
                {note.body && (
                  <p className="text-xs text-sand-400 mt-1 whitespace-pre-wrap">
                    {note.body}
                  </p>
                )}
              </div>
              <div className="flex gap-0.5 shrink-0">
                {/* Pin toggle */}
                <button
                  onClick={() =>
                    startTransition(() => toggleNotePin(note.id, path))
                  }
                  aria-label={note.pinned ? "Quitar pin" : "Fijar arriba"}
                  aria-pressed={note.pinned}
                  className={[
                    "p-1.5 rounded-lg transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400",
                    "focus-visible:ring-offset-2 focus-visible:ring-offset-sand-900",
                    note.pinned
                      ? "text-warning hover:text-warning/60 hover:bg-sand-850"
                      : "text-sand-600 hover:text-sand-400 hover:bg-sand-850",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <Pin size={14} strokeWidth={1.5} aria-hidden="true" />
                </button>
                {/* Edit */}
                <button
                  onClick={() => setEditingNote(note)}
                  aria-label={`Editar nota "${note.title}"`}
                  className="p-1.5 rounded-lg transition-colors text-sand-600 hover:text-gold-400 hover:bg-sand-850 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 focus-visible:ring-offset-sand-900"
                >
                  <Pencil size={14} strokeWidth={1.5} aria-hidden="true" />
                </button>
                {/* Delete */}
                <button
                  onClick={() =>
                    startTransition(() => deleteNote(note.id, path))
                  }
                  aria-label={`Borrar nota "${note.title}"`}
                  className="p-1.5 rounded-lg transition-colors text-sand-700 hover:text-danger hover:bg-danger-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 focus-visible:ring-offset-sand-900"
                >
                  <Trash2 size={14} strokeWidth={1.5} aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {open && (
        <AddNoteModal
          stopId={stopId}
          slug={slug}
          onClose={() => setOpen(false)}
        />
      )}

      {editingNote && (
        <EditNoteModal
          note={editingNote}
          path={path}
          onClose={() => setEditingNote(null)}
        />
      )}
    </Card>
  );
}

function AddNoteModal({
  stopId, slug, onClose,
}: {
  stopId: string | null;
  slug: string | null;
  onClose: () => void;
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
    <Modal title="Nueva nota" onClose={onClose}>
      <form action={handleSubmit} className="space-y-3">
        <Field
          label="Título"
          name="title"
          required
          placeholder="Ej: Hostel paga en cash"
          autoFocus
        />
        <TextareaField
          label="Cuerpo"
          name="body"
          placeholder="Detalles..."
          rows={3}
        />
        <label className="flex items-center gap-2 text-sm text-sand-300 cursor-pointer">
          <input
            type="checkbox"
            name="pinned"
            value="true"
            className="rounded border-sand-600 accent-gold-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400"
          />
          Fijar arriba
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
    </Modal>
  );
}

function EditNoteModal({
  note, path, onClose,
}: {
  note: Note;
  path: string;
  onClose: () => void;
}) {
  const [, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(() => {
      updateNote(note.id, formData, path).then(onClose);
    });
  }

  return (
    <Modal title="Editar nota" onClose={onClose}>
      <form action={handleSubmit} className="space-y-3">
        <Field
          label="Título"
          name="title"
          required
          defaultValue={note.title}
          autoFocus
        />
        <TextareaField
          label="Cuerpo"
          name="body"
          defaultValue={note.body}
          rows={3}
        />
        <div className="flex gap-2 pt-1">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" className="flex-1">
            Guardar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
