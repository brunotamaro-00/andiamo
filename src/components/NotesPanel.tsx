"use client";

import { useState, useRef, useEffect } from "react";
import { Pin, Trash2, Plus, Pencil, Check, StickyNote, Loader2, AlertCircle } from "lucide-react";
import { createNote, toggleNotePin, deleteNote, updateNote } from "@/app/actions/notes";
import { haptics } from "@/lib/haptics";
import { useOptimisticList } from "@/lib/use-optimistic-list";
import { Card, SectionHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, TextareaField } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/EmptyState";
import { InlineDeleteConfirm } from "@/components/ui/InlineDeleteConfirm";
import { MutationErrorBanner } from "@/components/ui/MutationErrorBanner";
import { rowActionBtn as actionBtn } from "@/components/ui/row-action";
import { useToast } from "@/components/ui/Toast";

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

type OptimisticAction =
  | { type: "togglePin"; id: string }
  | { type: "delete"; id: string }
  | { type: "add"; note: Note };

export function NotesPanel({ stopId, slug, notes, path }: NotesPanelProps) {
  const [open, setOpen] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const { toast } = useToast();

  const { items: optimisticNotes, mutate, mutationError, isPending } = useOptimisticList(
    notes,
    (state, action: OptimisticAction) => {
      switch (action.type) {
        case "togglePin":
          return state.map((n) =>
            n.id === action.id ? { ...n, pinned: !n.pinned } : n
          );
        case "delete":
          return state.filter((n) => n.id !== action.id);
        case "add":
          return [action.note, ...state];
      }
    }
  );

  function handleTogglePin(id: string) {
    haptics.tap();
    mutate({ type: "togglePin", id }, () => toggleNotePin(id, path), "No se pudo guardar el cambio. Reintentá.");
  }

  function handleDelete(id: string) {
    setConfirmingId(null);
    haptics.warning();
    mutate({ type: "delete", id }, () => deleteNote(id, path), "No se pudo borrar la nota. Reintentá.", () => toast("Nota borrada"));
  }

  function handleAdd(formData: FormData) {
    if (stopId) formData.set("stopId", stopId);
    if (slug) formData.set("slug", slug);
    const pinned = formData.get("pinned") === "true";
    const temp: Note = {
      id: `temp-${Date.now()}`,
      title: (formData.get("title") as string) || "—",
      body: (formData.get("body") as string) || "",
      pinned,
      createdAt: new Date(),
    };
    setOpen(false);
    haptics.success();
    mutate({ type: "add", note: temp }, () => createNote(formData), "No se pudo agregar la nota. Reintentá.", () => toast("Nota agregada"));
  }

  async function handleSave(id: string, title: string, body: string): Promise<"ok" | "error"> {
    const fd = new FormData();
    fd.set("title", title);
    fd.set("body", body);
    try {
      // updateNote resolves { error } on validation failure instead of throwing
      const result = await updateNote(id, fd, path);
      if (result?.error) {
        haptics.error();
        return "error";
      }
      haptics.success();
      return "ok";
    } catch {
      haptics.error();
      return "error";
    }
  }

  const pinned = optimisticNotes.filter((n) => n.pinned);
  const rest = optimisticNotes.filter((n) => !n.pinned);
  const sorted = [...pinned, ...rest];

  return (
    <Card>
      <SectionHeader
        title="Notas"
        count={optimisticNotes.length > 0 ? optimisticNotes.length : undefined}
        action={
          <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
            <Plus size={13} strokeWidth={1.5} aria-hidden="true" />
            Agregar
          </Button>
        }
      />

      <MutationErrorBanner message={mutationError} />

      {sorted.length === 0 ? (
        <EmptyState
          icon={StickyNote}
          title="Sin notas todavía"
          description="Guardá recordatorios: códigos de reserva, horarios, lo que pagás en efectivo."
          action={
            <Button variant="primary" size="sm" onClick={() => setOpen(true)}>
              <Plus size={13} strokeWidth={1.5} aria-hidden="true" />
              Agregar la primera
            </Button>
          }
        />
      ) : (
        <div
          className={`space-y-2 transition-opacity ${isPending ? "opacity-70" : ""}`}
        >
          {sorted.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              confirming={confirmingId === note.id}
              onTogglePin={() => handleTogglePin(note.id)}
              onRequestDelete={() => setConfirmingId(note.id)}
              onCancelDelete={() => setConfirmingId(null)}
              onConfirmDelete={() => handleDelete(note.id)}
              onSave={(title, body) => handleSave(note.id, title, body)}
            />
          ))}
        </div>
      )}

      {open && (
        <AddNoteModal onSubmit={handleAdd} onClose={() => setOpen(false)} />
      )}
    </Card>
  );
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

function NoteCard({
  note, confirming, onTogglePin, onRequestDelete, onCancelDelete, onConfirmDelete, onSave,
}: {
  note: Note;
  confirming: boolean;
  onTogglePin: () => void;
  onRequestDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
  onSave: (title: string, body: string) => Promise<"ok" | "error">;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [expanded, setExpanded] = useState(false);
  const [clamped, setClamped] = useState(false);
  const bodyRef = useRef<HTMLParagraphElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef(false);

  /* Detect whether the collapsed body actually overflows its 2-line clamp,
     so the "Ver más" hint only shows on long notes. */
  useEffect(() => {
    if (editing || expanded) return;
    const el = bodyRef.current;
    if (!el) return;
    setClamped(el.scrollHeight > el.clientHeight + 1);
  }, [note.body, editing, expanded]);

  /* Seed the editable fields from the latest note when entering edit mode.
     We intentionally gate on `editing` rather than note values to avoid
     overwriting in-progress edits on re-renders. The initialisation runs
     inside a callback so it's not synchronous within the effect body. */
  useEffect(() => {
    if (!editing) return;
    const id = requestAnimationFrame(() => {
      setTitle(note.title);
      setBody(note.body);
      setStatus("idle");
    });
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  /* Flush any pending save on unmount. */
  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  function scheduleSave(nextTitle: string, nextBody: string) {
    if (timer.current) clearTimeout(timer.current);
    // Allow saving with an empty title — server will use body's first line as fallback
    dirty.current = true;
    setStatus("saving");
    timer.current = setTimeout(async () => {
      // Clear dirty before awaiting — otherwise closing while this save is in
      // flight re-triggers onSave with the same content (double write)
      dirty.current = false;
      const result = await onSave(nextTitle.trim(), nextBody);
      setStatus(result === "ok" ? "saved" : "error");
    }, 700);
  }

  async function closeEditor() {
    if (timer.current) clearTimeout(timer.current);
    if (dirty.current) {
      dirty.current = false;
      setStatus("saving");
      const result = await onSave(title.trim(), body);
      setStatus(result === "ok" ? "saved" : "error");
    }
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="p-3 rounded-lg border border-brick-border/40 bg-surface-2/40 space-y-2">
        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            scheduleSave(e.target.value, body);
          }}
          aria-label="Título de la nota"
          placeholder="Título"
          className="w-full bg-transparent text-base font-medium text-ink placeholder:text-ink-faint focus:outline-none"
          autoFocus
        />
        <textarea
          value={body}
          onChange={(e) => {
            setBody(e.target.value);
            scheduleSave(title, e.target.value);
          }}
          aria-label="Cuerpo de la nota"
          placeholder="Detalles..."
          rows={Math.min(12, Math.max(3, body.split("\n").length + 1))}
          className="w-full bg-transparent text-base text-ink-2 placeholder:text-ink-faint focus:outline-none resize-none"
        />
        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] text-ink-3 flex items-center gap-1" aria-live="polite">
            {status === "saving" && (
              <>
                <Loader2 size={11} className="animate-spin" aria-hidden="true" />
                Guardando…
              </>
            )}
            {status === "saved" && (
              <>
                <Check size={11} strokeWidth={2} aria-hidden="true" className="text-success" />
                Guardado
              </>
            )}
            {status === "error" && (
              <span className="text-danger flex items-center gap-1">
                <AlertCircle size={11} strokeWidth={1.5} aria-hidden="true" />
                Error al guardar
              </span>
            )}
            {status === "idle" && !title.trim() && body.trim() && (
              <span className="text-ink-3 text-[11px]">Sin título</span>
            )}
          </span>
          <Button variant="ghost" size="sm" onClick={closeEditor}>
            Listo
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`p-3 rounded-lg border transition-colors ${
        note.pinned
          ? "border-warning/30 bg-warning-bg/40"
          : "border-border bg-surface-2/30"
      }`}
    >
      {/* Header row: only the title shares width with the action buttons —
          the body renders below at full card width. */}
      <div className="flex items-start justify-between gap-1">
        <button
          onClick={() => (note.body ? setExpanded((v) => !v) : setEditing(true))}
          aria-expanded={note.body ? expanded : undefined}
          className="flex-1 min-w-0 text-left rounded-lg -m-1 p-1 transition-colors hover:bg-surface-2/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick"
          aria-label={
            note.body
              ? `${expanded ? "Colapsar" : "Expandir"} nota "${note.title}"`
              : `Editar nota "${note.title}"`
          }
        >
          <div className="flex items-center gap-1.5">
            {note.pinned && (
              <Pin
                size={12}
                strokeWidth={1.5}
                aria-hidden="true"
                className="text-warning shrink-0"
              />
            )}
            <span className="text-sm font-medium text-ink">{note.title}</span>
          </div>
        </button>

        {confirming ? (
          <InlineDeleteConfirm
            label={note.title}
            onConfirm={onConfirmDelete}
            onCancel={onCancelDelete}
          />
        ) : (
          <div className="flex items-center shrink-0">
            <button
              onClick={onTogglePin}
              aria-label={note.pinned ? "Quitar pin" : "Fijar arriba"}
              aria-pressed={note.pinned}
              className={`${actionBtn} ${
                note.pinned
                  ? "text-warning hover:bg-surface-2"
                  : "text-ink-faint hover:text-ink-2 hover:bg-surface-2"
              }`}
            >
              <Pin size={16} strokeWidth={1.5} aria-hidden="true" />
            </button>
            <button
              onClick={() => setEditing(true)}
              aria-label={`Editar nota "${note.title}"`}
              className={`${actionBtn} text-ink-faint hover:text-brick hover:bg-surface-2`}
            >
              <Pencil size={16} strokeWidth={1.5} aria-hidden="true" />
            </button>
            <button
              onClick={onRequestDelete}
              aria-label={`Borrar nota "${note.title}"`}
              className={`${actionBtn} text-border-strong hover:text-danger hover:bg-danger-bg`}
            >
              <Trash2 size={16} strokeWidth={1.5} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      {note.body && (
        <button
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-label={`${expanded ? "Colapsar" : "Expandir"} nota "${note.title}"`}
          className="block w-full text-left rounded-lg -mx-1 -mb-1 px-1 pb-1 transition-colors hover:bg-surface-2/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick"
        >
          <p
            ref={bodyRef}
            className={`text-xs text-ink-2 mt-1 whitespace-pre-wrap ${
              expanded ? "" : "line-clamp-2"
            }`}
          >
            {note.body}
          </p>
          {(clamped || expanded) && (
            <span className="mt-1 inline-block text-[11px] font-extrabold uppercase tracking-[0.08em] text-ink-3">
              {expanded ? "Ver menos" : "Ver más"}
            </span>
          )}
        </button>
      )}
    </div>
  );
}

function AddNoteModal({
  onSubmit, onClose,
}: {
  onSubmit: (formData: FormData) => void;
  onClose: () => void;
}) {
  return (
    <Modal title="Nueva nota" onClose={onClose}>
      <form action={onSubmit} className="space-y-3">
        <Field
          label="Título (opcional)"
          name="title"
          placeholder="Ej: Hostel paga en cash"
        />
        <TextareaField
          label="Cuerpo"
          name="body"
          placeholder="Detalles..."
          rows={3}
        />
        <label className="flex items-center gap-2 text-sm text-ink-2 cursor-pointer">
          <input
            type="checkbox"
            name="pinned"
            value="true"
            className="rounded border-ink-faint accent-brick focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick"
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
