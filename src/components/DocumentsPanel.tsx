"use client";

import { useState, useRef, useId, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  BedDouble, Ticket, Car, TrainFront, ShieldCheck, Plane, FileText,
  ArrowUpRight, Trash2, Plus, Upload, AlertCircle, Loader2, Download, Pencil,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { DocumentKind } from "@/generated/prisma/enums";
import { createDocumentLink, updateDocument, deleteDocument } from "@/app/actions/documents";
import { haptics } from "@/lib/haptics";
import { useOptimisticList } from "@/lib/use-optimistic-list";
import { Card, SectionHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, SelectField, TextareaField, inputClass } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/EmptyState";
import { InlineDeleteConfirm } from "@/components/ui/InlineDeleteConfirm";
import { MutationErrorBanner } from "@/components/ui/MutationErrorBanner";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useToast } from "@/components/ui/Toast";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { IS_DEMO } from "@/lib/demo";
import { rowActionBtn as actionBtn } from "@/components/ui/row-action";

/* Keep in sync with the server route validation. */
const MAX_BYTES = 20 * 1024 * 1024;
const ALLOWED_EXT = ["pdf", "jpg", "jpeg", "png", "webp"];
const ACCEPT = ".pdf,.jpg,.jpeg,.png,.webp";

interface Document {
  id: string;
  label: string;
  note: string | null;
  kind: string;
  source: string;
  fileName: string | null;
  externalUrl: string | null;
  sizeBytes: number | null;
  docDate: string | null;
}

// `satisfies Record<DocumentKind, string>` makes the compiler reject a missing kind:
// DOCUMENT_KINDS feeds the edit <select>, so a kind without an <option> made the
// browser fall back to the first one and silently rewrite the document on save.
const KIND_LABEL: Record<string, string> = {
  checkin: "Check-in", voucher: "Voucher", ticket: "Entrada",
  carRental: "Auto", train: "Tren", insurance: "Seguro", flight: "Vuelo", other: "Otro",
} satisfies Record<DocumentKind, string>;

const KIND_ICON: Record<string, LucideIcon> = {
  checkin:   BedDouble,
  voucher:   Ticket,
  ticket:    Ticket,
  carRental: Car,
  train:     TrainFront,
  insurance: ShieldCheck,
  flight:    Plane,
  other:     FileText,
} satisfies Record<DocumentKind, LucideIcon>;

// Ordered by the schema enum, so the <select> can never drift from the DB.
const DOCUMENT_KINDS: string[] = Object.values(DocumentKind);

/** Format a YYYY-MM-DD entry/reservation date for display (UTC-anchored). */
function formatDocDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Sort docs by their entry/reservation date, soonest first; dateless docs last. */
function sortByDate(docs: Document[]): Document[] {
  return [...docs].sort((a, b) => {
    if (a.docDate && b.docDate) return a.docDate.localeCompare(b.docDate);
    if (a.docDate) return -1;
    if (b.docDate) return 1;
    return 0;
  });
}

interface DocumentsPanelProps {
  stopId: string | null;
  slug: string | null;
  documents: Document[];
  path: string;
}

type DocAction =
  | { type: "delete"; id: string }
  | { type: "add"; doc: Document }
  | { type: "update"; doc: Document };

const docActionBtnClass =
  "flex-1 inline-flex items-center justify-center gap-1.5 rounded-full border-2 border-ink px-3 py-2 text-[11px] font-extrabold uppercase tracking-[0.08em] text-ink min-h-[44px] transition-colors duration-150 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick/40 disabled:opacity-40";

/** Downloads an uploaded file to the device. On mobile, prefers the native
 *  share sheet (Save to Files / Photos). Offline cache is automatic via the
 *  service worker whenever the file is fetched (open or download). */
function DownloadDocButton({
  docId, fileName,
}: {
  docId: string;
  fileName: string | null;
}) {
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const url = `/api/documents/${docId}`;
  const name = fileName?.trim() || `documento-${docId}`;

  async function handleDownload() {
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("fetch failed");
      const blob = await res.blob();
      // Guard against saving a web page as a boarding pass. Uploaded documents
      // are PDFs and images; an HTML body here means something served a page
      // instead of the file (an offline fallback, a login redirect). Saving it
      // under the name "voucher.pdf" is worse than failing — you find out at
      // the check-in desk.
      if (blob.type.startsWith("text/html")) throw new Error("not a file");
      const type = blob.type || "application/octet-stream";
      const file = new File([blob], name, { type });

      // iOS / Android: share sheet → "Guardar en Archivos" / Downloads
      if (
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({ files: [file], title: name });
        return;
      }

      // Desktop / browsers without file sharing: trigger a real download
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = name;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      // User dismissed the share sheet — not an error
      if (err instanceof DOMException && err.name === "AbortError") return;
      toast(
        err instanceof Error && err.message === "not a file"
          ? "El archivo no está disponible sin conexión"
          : "No se pudo descargar el archivo",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={saving}
      aria-label="Descargar documento al celular"
      className={docActionBtnClass}
    >
      {saving ? (
        <Loader2 size={13} className="animate-spin" aria-hidden="true" />
      ) : (
        <Download size={13} strokeWidth={2} aria-hidden="true" />
      )}
      {saving ? "…" : "Descargar"}
    </button>
  );
}

export function DocumentsPanel({ stopId, slug, documents, path }: DocumentsPanelProps) {
  // The demo deploy has no R2 credentials, so /api/documents/upload would 500.
  // Adding by link still works, which is what the demo seed uses anyway.
  const addMode = IS_DEMO ? "link" : "upload";
  const [mode, setMode] = useState<"link" | "upload" | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const { toast } = useToast();

  const { items: optimisticDocs, mutate, mutationError, isPending } = useOptimisticList(
    documents,
    (state, action: DocAction) => {
      switch (action.type) {
        case "delete":
          return state.filter((d) => d.id !== action.id);
        case "add":
          return [...state, action.doc];
        case "update":
          return state.map((d) => (d.id === action.doc.id ? action.doc : d));
      }
    }
  );

  const sortedDocs = useMemo(() => sortByDate(optimisticDocs), [optimisticDocs]);
  const openDoc = openId ? optimisticDocs.find((d) => d.id === openId) ?? null : null;

  function handleDelete(id: string) {
    setOpenId(null);
    haptics.warning();
    mutate({ type: "delete", id }, () => deleteDocument(id, path), "No se pudo borrar el documento. Reintentá.", () => toast("Documento borrado"));
  }

  function handleUpdate(doc: Document, formData: FormData) {
    const updated: Document = {
      ...doc,
      label: (formData.get("label") as string)?.trim() || doc.label,
      note: ((formData.get("note") as string) ?? "").trim() || null,
      kind: (formData.get("kind") as string) || doc.kind,
      docDate: (formData.get("docDate") as string) || null,
      externalUrl:
        doc.source === "link" ? (formData.get("url") as string) || doc.externalUrl : doc.externalUrl,
    };
    setOpenId(null);
    haptics.success();
    mutate(
      { type: "update", doc: updated },
      () => updateDocument(doc.id, formData, path),
      "No se pudo guardar el documento. Reintentá.",
      () => toast("Documento actualizado"),
    );
  }

  function handleAddLink(formData: FormData) {
    if (stopId) formData.set("stopId", stopId);
    if (slug) formData.set("slug", slug);
    const temp: Document = {
      id: `temp-${Date.now()}`,
      label: (formData.get("label") as string) || "—",
      note: ((formData.get("note") as string) ?? "").trim() || null,
      kind: (formData.get("kind") as string) || "other",
      source: "link",
      fileName: null,
      externalUrl: (formData.get("url") as string) || null,
      sizeBytes: null,
      docDate: (formData.get("docDate") as string) || null,
    };
    setMode(null);
    haptics.success();
    mutate({ type: "add", doc: temp }, () => createDocumentLink(formData), "No se pudo agregar el link. Reintentá.", () => toast("Link agregado"));
  }

  return (
    <Card>
      <SectionHeader
        title="Documentos"
        count={optimisticDocs.length > 0 ? optimisticDocs.length : undefined}
        action={
          <Button variant="ghost" size="sm" onClick={() => setMode(addMode)}>
            <Plus size={13} strokeWidth={1.5} aria-hidden="true" />
            Agregar
          </Button>
        }
      />

      <MutationErrorBanner message={mutationError} />

      {optimisticDocs.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Sin documentos"
          description={
            IS_DEMO
              ? "Guardá entradas, reservas y seguros pegando un link."
              : "Guardá entradas, reservas y seguros. Subí PDFs/imágenes o pegá un link."
          }
          action={
            <Button variant="primary" size="sm" onClick={() => setMode(addMode)}>
              <Upload size={13} strokeWidth={1.5} aria-hidden="true" />
              Agregar documento
            </Button>
          }
        />
      ) : (
        <div
          className={`space-y-2 transition-opacity ${isPending ? "opacity-70" : ""}`}
        >
          {sortedDocs.map((doc) => {
            const Icon = KIND_ICON[doc.kind] ?? FileText;
            const date = formatDocDate(doc.docDate);
            return (
              <div
                key={doc.id}
                className="flex items-center gap-1 p-2.5 rounded-lg bg-surface-2/40 border border-border transition-colors hover:border-border-strong"
              >
                {/* Tapping the card opens the detail sheet (edit/delete). */}
                <button
                  onClick={() => setOpenId(doc.id)}
                  className="flex-1 min-w-0 flex items-center gap-2.5 text-left rounded-lg px-1 py-1 -my-1 transition-colors hover:bg-surface-2/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick"
                  aria-label={`Ver detalle de "${doc.label}"`}
                >
                  <Icon size={18} strokeWidth={1.5} aria-hidden="true" className="text-ink-3 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink truncate">
                      {doc.label}
                    </p>
                    <p className="text-xs text-ink-2">
                      {KIND_LABEL[doc.kind] ?? doc.kind}
                      {date ? ` · ${date}` : ""}
                    </p>
                    {doc.note && (
                      <p className="text-xs text-ink-3 truncate mt-0.5">
                        {doc.note}
                      </p>
                    )}
                  </div>
                </button>
                {/* Explicit open icon — opens the document directly in one tap. */}
                <a
                  href={`/api/documents/${doc.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Abrir ${doc.label}`}
                  className={`${actionBtn} text-brick hover:text-brick-hover hover:bg-surface-2 shrink-0`}
                >
                  <ArrowUpRight size={18} strokeWidth={1.5} aria-hidden="true" />
                </a>
              </div>
            );
          })}
        </div>
      )}

      {mode !== null && (
        <AddDocumentModal
          initialMode={mode}
          stopId={stopId}
          onSubmitLink={handleAddLink}
          onClose={() => setMode(null)}
        />
      )}

      {openDoc && (
        <DocDetailModal
          doc={openDoc}
          onSave={(fd) => handleUpdate(openDoc, fd)}
          onDelete={() => handleDelete(openDoc.id)}
          onClose={() => setOpenId(null)}
        />
      )}
    </Card>
  );
}

/** Per-document detail sheet: open/download the file, or switch to an inline
 *  edit form, or delete. Replaces the old row action icons. */
function DocDetailModal({
  doc, onSave, onDelete, onClose,
}: {
  doc: Document;
  onSave: (formData: FormData) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const Icon = KIND_ICON[doc.kind] ?? FileText;
  const date = formatDocDate(doc.docDate);

  if (editing) {
    return (
      <Modal title="Editar documento" onClose={onClose}>
        <form action={onSave} className="space-y-3">
          <Field label="Etiqueta" name="label" required defaultValue={doc.label} autoFocus />
          <TextareaField
            label="Nota"
            name="note"
            defaultValue={doc.note ?? ""}
            placeholder="Descripción o detalle del documento…"
          />
          <SelectField label="Tipo" name="kind" defaultValue={doc.kind}>
            {DOCUMENT_KINDS.map((k) => (
              <option key={k} value={k}>
                {KIND_LABEL[k]}
              </option>
            ))}
          </SelectField>
          <Field
            label="Fecha (entrada/reserva)"
            name="docDate"
            type="date"
            defaultValue={doc.docDate ?? ""}
            hint="Opcional — ordena los documentos por esta fecha"
          />
          {doc.source === "link" && (
            <Field
              label="URL"
              name="url"
              type="url"
              required
              defaultValue={doc.externalUrl ?? ""}
              placeholder="https://..."
            />
          )}
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setEditing(false)}>
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

  return (
    <Modal title="Documento" onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="grid place-items-center h-11 w-11 rounded-lg bg-surface-2 text-ink-3 shrink-0">
            <Icon size={20} strokeWidth={1.5} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-base font-semibold text-ink truncate">{doc.label}</p>
            <p className="text-xs text-ink-2">
              {KIND_LABEL[doc.kind] ?? doc.kind}
              {date ? ` · ${date}` : ""}
            </p>
          </div>
        </div>

        {doc.note && (
          <p className="text-sm text-ink-2 whitespace-pre-wrap rounded-lg bg-surface-2/40 border border-border p-3">
            {doc.note}
          </p>
        )}

        <div className="flex items-center gap-2">
          {doc.source === "upload" && (
            <DownloadDocButton docId={doc.id} fileName={doc.fileName} />
          )}
          <a
            href={`/api/documents/${doc.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className={docActionBtnClass}
          >
            Abrir
            <ArrowUpRight size={13} strokeWidth={2} aria-hidden="true" />
          </a>
        </div>

        {confirming ? (
          <InlineDeleteConfirm label={doc.label} onConfirm={onDelete} onCancel={() => setConfirming(false)} />
        ) : (
          <div className="flex gap-2 border-t border-border pt-3">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setEditing(true)}>
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

/** One "Agregar" modal for both sources; a segmented control switches
 *  between subir archivo y pegar link. */
function AddDocumentModal({
  initialMode, stopId, onSubmitLink, onClose,
}: {
  initialMode: "link" | "upload";
  stopId: string | null;
  onSubmitLink: (formData: FormData) => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<"link" | "upload">(initialMode);
  const [busy, setBusy] = useState(false);

  return (
    <Modal title="Agregar documento" onClose={onClose} locked={busy}>
      {/* Demo: only the link form exists, so the picker would offer a broken
          option (no R2 credentials on that deploy). */}
      {IS_DEMO ? null : (
        <SegmentedControl
          label="Tipo de documento"
          value={mode}
          onChange={(v) => { if (!busy) setMode(v); }}
          options={[
            { value: "upload", label: "Archivo" },
            { value: "link", label: "Link" },
          ]}
        />
      )}
      {mode === "link" ? (
        <LinkForm onSubmit={onSubmitLink} onClose={onClose} />
      ) : (
        <UploadForm stopId={stopId} onClose={onClose} onBusyChange={setBusy} />
      )}
    </Modal>
  );
}

function LinkForm({
  onSubmit, onClose,
}: {
  onSubmit: (formData: FormData) => void;
  onClose: () => void;
}) {
  return (
    <form action={onSubmit} className="space-y-3">
        <Field
          label="Etiqueta"
          name="label"
          required
          placeholder="Ej: Check-in Generator Hostel"
        />
        <TextareaField
          label="Nota"
          name="note"
          placeholder="Opcional — descripción o detalle del documento"
        />
        <SelectField label="Tipo" name="kind">
          {DOCUMENT_KINDS.map((k) => (
            <option key={k} value={k}>
              {KIND_LABEL[k]}
            </option>
          ))}
        </SelectField>
        <Field
          label="Fecha (entrada/reserva)"
          name="docDate"
          type="date"
          hint="Opcional — ordena los documentos por esta fecha"
        />
        <Field
          label="URL"
          name="url"
          type="url"
          required
          placeholder="https://..."
          hint="Link a la reserva, entrada o check-in online"
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
  );
}

/** No progress for this long = the connection died mid-upload. `xhr.onerror`
 *  does not fire for a socket that stays open and silent, which is exactly what
 *  hostel wifi does, and the sheet is `locked` while uploading: without this the
 *  promise never settles and the only way out of the modal is force-quitting
 *  the PWA. Measured between progress events, not from the start, so a genuinely
 *  slow 20 MB upload isn't cut off. */
const UPLOAD_STALL_MS = 30_000;

function uploadWithProgress(
  fd: FormData,
  onProgress: (pct: number) => void,
  registerAbort: (abort: () => void) => void,
): Promise<{ ok: boolean; status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let stallTimer: ReturnType<typeof setTimeout>;
    const armStallTimer = () => {
      clearTimeout(stallTimer);
      stallTimer = setTimeout(() => xhr.abort(), UPLOAD_STALL_MS);
    };
    const settle = (fn: () => void) => {
      clearTimeout(stallTimer);
      fn();
    };

    xhr.open("POST", "/api/documents/upload");
    registerAbort(() => xhr.abort());
    xhr.upload.onprogress = (e) => {
      armStallTimer();
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () =>
      settle(() =>
        resolve({
          ok: xhr.status >= 200 && xhr.status < 300,
          status: xhr.status,
          body: xhr.responseText,
        }),
      );
    xhr.onerror = () => settle(() => reject(new Error("Error de red")));
    xhr.onabort = () => settle(() => reject(new UploadAbortedError()));
    armStallTimer();
    xhr.send(fd);
  });
}

class UploadAbortedError extends Error {
  constructor() {
    super("Subida cancelada");
    this.name = "UploadAbortedError";
  }
}

function UploadForm({
  stopId, onClose, onBusyChange,
}: {
  stopId: string | null; onClose: () => void; onBusyChange: (busy: boolean) => void;
}) {
  const router = useRouter();
  const fileInputId = useId();
  const { toast } = useToast();
  const [uploading, setUploadingState] = useState(false);
  const setUploading = (v: boolean) => {
    setUploadingState(v);
    onBusyChange(v);
  };
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [note, setNote] = useState("");
  const [kind, setKind] = useState("other");
  const [docDate, setDocDate] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<(() => void) | null>(null);

  function validate(file: File): string | null {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_EXT.includes(ext)) {
      return "Formato no permitido. Usá PDF, JPG, PNG o WebP.";
    }
    if (file.size > MAX_BYTES) {
      return "El archivo supera el máximo de 20 MB.";
    }
    return null;
  }

  function handleFileChange() {
    setError(null);
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setFileName(null);
      return;
    }
    setFileName(file.name);
    const err = validate(file);
    if (err) setError(err);
    if (!label) setLabel(file.name.replace(/\.[^.]+$/, ""));
  }

  async function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file || !label.trim()) return;
    const err = validate(file);
    if (err) {
      setError(err);
      return;
    }

    setError(null);
    setUploading(true);
    setProgress(0);

    const fd = new FormData();
    fd.set("file", file);
    fd.set("label", label.trim());
    if (note.trim()) fd.set("note", note.trim());
    fd.set("kind", kind);
    if (docDate) fd.set("docDate", docDate);
    if (stopId) fd.set("stopId", stopId);

    try {
      const res = await uploadWithProgress(fd, setProgress, (abort) => {
        abortRef.current = abort;
      });
      if (!res.ok) {
        let message = "No se pudo subir el archivo.";
        try {
          message = JSON.parse(res.body)?.error ?? message;
        } catch {
          /* keep default */
        }
        setError(message);
        setUploading(false);
        return;
      }
      haptics.success();
      toast("Documento subido");
      router.refresh();
      onClose();
    } catch (e) {
      haptics.error();
      setError(
        e instanceof UploadAbortedError
          ? "Subida cancelada. El archivo no se guardó."
          : "Error de red. Revisá la conexión e intentá de nuevo.",
      );
      setUploading(false);
    } finally {
      abortRef.current = null;
    }
  }

  /** Cancel while uploading aborts the request instead of doing nothing — the
   *  sheet is locked during the upload, so this is the only way out. */
  function handleCancel() {
    if (uploading) {
      abortRef.current?.();
      return;
    }
    onClose();
  }

  return (
      <div className="space-y-3">
        <Field
          label="Etiqueta"
          name="label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Ej: Voucher hostel Londres"
        />
        <TextareaField
          label="Nota"
          name="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Opcional — descripción o detalle del documento"
        />
        <SelectField
          label="Tipo"
          name="kind"
          value={kind}
          onChange={(e) => setKind(e.target.value)}
        >
          {DOCUMENT_KINDS.map((k) => (
            <option key={k} value={k}>
              {KIND_LABEL[k]}
            </option>
          ))}
        </SelectField>
        <Field
          label="Fecha (entrada/reserva)"
          name="docDate"
          type="date"
          value={docDate}
          onChange={(e) => setDocDate(e.target.value)}
          hint="Opcional — ordena los documentos por esta fecha"
        />
        <div>
          <label htmlFor={fileInputId} className="block text-left text-[11px] font-extrabold uppercase tracking-[0.08em] text-ink-3 mb-1.5 leading-none">Archivo</label>
          <input
            id={fileInputId}
            ref={fileRef}
            type="file"
            accept={ACCEPT}
            onChange={handleFileChange}
            disabled={uploading}
            className={`${inputClass} h-[42px] py-0 flex items-center cursor-pointer file:mr-3 file:my-0 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-border file:text-ink hover:file:bg-border-strong`}
          />
          <p className="text-[11px] text-ink-faint mt-1">
            PDF, JPG, PNG o WebP · máximo 20 MB
          </p>
        </div>

        {error && (
          <p className="text-danger text-xs flex items-center gap-1.5" role="alert">
            <AlertCircle size={13} strokeWidth={1.5} aria-hidden="true" className="shrink-0" />
            {error}
          </p>
        )}

        {uploading && (
          <div aria-live="polite">
            <div className="flex items-center justify-between text-[11px] text-ink-3 mb-1">
              <span>Subiendo {fileName ?? ""}</span>
              <span>{progress}%</span>
            </div>
            <ProgressBar value={progress} fillClass="bg-brick" />
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            onClick={handleCancel}
          >
            {uploading ? "Cancelar subida" : "Cancelar"}
          </Button>
          <Button
            variant="primary"
            className="flex-1"
            onClick={handleUpload}
            disabled={uploading || !label.trim() || !!error || !fileName}
          >
            {uploading ? (
              <>
                <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                Subiendo…
              </>
            ) : (
              "Subir"
            )}
          </Button>
        </div>
      </div>
  );
}
