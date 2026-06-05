"use client";

import { useState, useTransition, useOptimistic, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  BedDouble, Ticket, Car, ShieldCheck, Plane, FileText,
  ArrowUpRight, Trash2, Plus, Upload, AlertCircle, Loader2, WifiOff, Download,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { createDocumentLink, deleteDocument } from "@/app/actions/documents";
import { Card, SectionHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, SelectField } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/EmptyState";
import { InlineDeleteConfirm } from "@/components/ui/InlineDeleteConfirm";
import { rowActionBtn as actionBtn } from "@/components/ui/row-action";

/* Keep in sync with the server route validation. */
const MAX_BYTES = 20 * 1024 * 1024;
const ALLOWED_EXT = ["pdf", "jpg", "jpeg", "png", "webp"];
const ACCEPT = ".pdf,.jpg,.jpeg,.png,.webp";

interface Document {
  id: string;
  label: string;
  kind: string;
  source: string;
  fileName: string | null;
  externalUrl: string | null;
  sizeBytes: number | null;
}

const KIND_LABEL: Record<string, string> = {
  checkin: "Check-in", voucher: "Voucher", ticket: "Entrada",
  carRental: "Auto", insurance: "Seguro", flight: "Vuelo", other: "Otro",
};

const KIND_ICON: Record<string, LucideIcon> = {
  checkin:   BedDouble,
  voucher:   Ticket,
  ticket:    Ticket,
  carRental: Car,
  insurance: ShieldCheck,
  flight:    Plane,
  other:     FileText,
};

const DOCUMENT_KINDS = Object.keys(KIND_LABEL) as (keyof typeof KIND_LABEL)[];

function formatSize(bytes: number | null): string | null {
  if (!bytes) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface DocumentsPanelProps {
  stopId: string | null;
  slug: string | null;
  documents: Document[];
  path: string;
}

/** Button that checks the SW cache and offers to save a document offline.
 *  Only rendered for uploaded files (source === "upload"). */
function OfflineDocButton({ docId }: { docId: string }) {
  const [cached, setCached] = useState<boolean | null>(null); // null = loading
  const [saving, setSaving] = useState(false);
  const url = `/api/documents/${docId}`;

  useEffect(() => {
    if (!("caches" in window)) {
      setCached(false);
      return;
    }
    caches
      .match(url)
      .then((match) => setCached(!!match))
      .catch(() => setCached(false));
  }, [url]);

  async function handleSave() {
    if (saving || cached) return;
    setSaving(true);
    try {
      await fetch(url); // SW will intercept and cache it
      setCached(true);
    } catch {
      // Network failure — can't cache right now
    } finally {
      setSaving(false);
    }
  }

  if (cached === null) return null; // still checking

  if (cached) {
    return (
      <span
        title="Disponible sin conexión"
        aria-label="Disponible sin conexión"
        className={`${actionBtn} text-success cursor-default`}
      >
        <WifiOff size={14} strokeWidth={1.5} aria-hidden="true" />
      </span>
    );
  }

  return (
    <button
      onClick={handleSave}
      disabled={saving}
      title="Guardar para usar sin conexión"
      aria-label="Guardar documento para uso sin conexión"
      className={`${actionBtn} text-ink-faint hover:text-ink-2 hover:bg-surface-2 disabled:opacity-40`}
    >
      {saving ? (
        <Loader2 size={14} className="animate-spin" aria-hidden="true" />
      ) : (
        <Download size={14} strokeWidth={1.5} aria-hidden="true" />
      )}
    </button>
  );
}

export function DocumentsPanel({ stopId, slug, documents, path }: DocumentsPanelProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"link" | "upload" | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [optimisticDocs, applyOptimistic] = useOptimistic(
    documents,
    (state, id: string) => state.filter((d) => d.id !== id)
  );

  function handleDelete(id: string) {
    setConfirmingId(null);
    setMutationError(null);
    startTransition(async () => {
      applyOptimistic(id);
      try {
        await deleteDocument(id, path);
      } catch {
        setMutationError("No se pudo borrar el documento. Reintentá.");
        router.refresh();
      }
    });
  }

  function handleAddLink(formData: FormData) {
    if (stopId) formData.set("stopId", stopId);
    if (slug) formData.set("slug", slug);
    setMode(null);
    setMutationError(null);
    startTransition(async () => {
      try {
        await createDocumentLink(formData);
      } catch {
        setMutationError("No se pudo agregar el link. Reintentá.");
        router.refresh();
      }
    });
  }

  return (
    <Card>
      <SectionHeader
        title="Documentos"
        count={optimisticDocs.length > 0 ? optimisticDocs.length : undefined}
        action={
          <>
            <Button variant="ghost" size="sm" onClick={() => setMode("link")}>
              <Plus size={13} strokeWidth={1.5} aria-hidden="true" />
              Link
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setMode("upload")}>
              <Upload size={13} strokeWidth={1.5} aria-hidden="true" />
              Subir
            </Button>
          </>
        }
      />

      {mutationError && (
        <p className="text-xs text-danger flex items-center gap-1.5 mb-2" role="alert">
          <AlertCircle size={12} strokeWidth={1.5} aria-hidden="true" className="shrink-0" />
          {mutationError}
        </p>
      )}

      {optimisticDocs.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Sin documentos"
          description="Guardá vouchers, entradas y seguros. Subí PDFs/imágenes o pegá un link."
          action={
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => setMode("link")}>
                <Plus size={13} strokeWidth={1.5} aria-hidden="true" />
                Link
              </Button>
              <Button variant="primary" size="sm" onClick={() => setMode("upload")}>
                <Upload size={13} strokeWidth={1.5} aria-hidden="true" />
                Subir archivo
              </Button>
            </div>
          }
        />
      ) : (
        <div
          className={`space-y-2 transition-opacity ${isPending ? "opacity-70" : ""}`}
        >
          {optimisticDocs.map((doc) => {
            const Icon = KIND_ICON[doc.kind] ?? FileText;
            const size = formatSize(doc.sizeBytes);
            return (
              <div
                key={doc.id}
                className="flex items-center gap-2 p-2.5 rounded-[4px] bg-surface-2/40 border border-border transition-colors hover:border-border-strong"
              >
                <Icon
                  size={18}
                  strokeWidth={1.5}
                  aria-hidden="true"
                  className="text-ink-3 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink truncate">
                    {doc.label}
                  </p>
                  <p className="text-xs text-ink-faint">
                    {KIND_LABEL[doc.kind] ?? doc.kind}
                    {size ? ` · ${size}` : ""}
                  </p>
                </div>

                {confirmingId === doc.id ? (
                  <InlineDeleteConfirm
                    label={doc.label}
                    onConfirm={() => handleDelete(doc.id)}
                    onCancel={() => setConfirmingId(null)}
                  />
                ) : (
                  <div className="flex items-center shrink-0">
                    {doc.source === "upload" && <OfflineDocButton docId={doc.id} />}
                    <a
                      href={`/api/documents/${doc.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`${actionBtn} text-brick hover:text-brick-hover hover:bg-surface-2`}
                      aria-label={`Abrir ${doc.label} en nueva pestaña`}
                    >
                      <ArrowUpRight size={16} strokeWidth={1.5} aria-hidden="true" />
                    </a>
                    <button
                      onClick={() => setConfirmingId(doc.id)}
                      aria-label={`Borrar documento "${doc.label}"`}
                      className={`${actionBtn} text-border-strong hover:text-danger hover:bg-danger-bg`}
                    >
                      <Trash2 size={16} strokeWidth={1.5} aria-hidden="true" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {mode === "link" && (
        <AddLinkModal onSubmit={handleAddLink} onClose={() => setMode(null)} />
      )}
      {mode === "upload" && (
        <UploadModal stopId={stopId} onClose={() => setMode(null)} />
      )}
    </Card>
  );
}

function AddLinkModal({
  onSubmit, onClose,
}: {
  onSubmit: (formData: FormData) => void;
  onClose: () => void;
}) {
  return (
    <Modal title="Agregar link" onClose={onClose}>
      <form action={onSubmit} className="space-y-3">
        <Field
          label="Etiqueta"
          name="label"
          required
          placeholder="Ej: Check-in Generator Hostel"
          autoFocus
        />
        <SelectField label="Tipo" name="kind">
          {DOCUMENT_KINDS.map((k) => (
            <option key={k} value={k}>
              {KIND_LABEL[k]}
            </option>
          ))}
        </SelectField>
        <Field label="URL" name="url" type="url" required placeholder="https://..." />
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

function uploadWithProgress(
  fd: FormData,
  onProgress: (pct: number) => void
): Promise<{ ok: boolean; status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/documents/upload");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () =>
      resolve({
        ok: xhr.status >= 200 && xhr.status < 300,
        status: xhr.status,
        body: xhr.responseText,
      });
    xhr.onerror = () => reject(new Error("Error de red"));
    xhr.send(fd);
  });
}

function UploadModal({
  stopId, onClose,
}: {
  stopId: string | null; onClose: () => void;
}) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [kind, setKind] = useState("other");
  const [fileName, setFileName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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
    fd.set("kind", kind);
    if (stopId) fd.set("stopId", stopId);

    try {
      const res = await uploadWithProgress(fd, setProgress);
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
      router.refresh();
      onClose();
    } catch {
      setError("Error de red. Revisá la conexión e intentá de nuevo.");
      setUploading(false);
    }
  }

  return (
    <Modal title="Subir documento" onClose={onClose}>
      <div className="space-y-3">
        <Field
          label="Etiqueta"
          name="label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Ej: Voucher hostel Londres"
          autoFocus
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
        <div>
          <label className="block text-left text-[11px] font-display uppercase tracking-wide text-ink-3 mb-1.5 leading-none">Archivo</label>
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPT}
            onChange={handleFileChange}
            disabled={uploading}
            className="mt-1 w-full text-sm text-ink-2 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-border file:text-ink hover:file:bg-border-strong cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick rounded-xl disabled:opacity-50"
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
            <div className="h-1.5 rounded-full bg-border overflow-hidden">
              <div
                className="h-full bg-brick transition-all duration-150"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            onClick={onClose}
            disabled={uploading}
          >
            Cancelar
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
    </Modal>
  );
}
