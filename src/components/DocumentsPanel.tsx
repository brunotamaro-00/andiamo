"use client";

import { useState, useTransition, useRef } from "react";
import {
  BedDouble, Ticket, Car, ShieldCheck, Plane, FileText,
  ArrowUpRight, Trash2, Plus, Upload,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { createDocumentLink, deleteDocument } from "@/app/actions/documents";
import { Card, SectionHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, SelectField } from "@/components/ui/Field";

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

interface DocumentsPanelProps {
  stopId: string | null;
  slug: string | null;
  documents: Document[];
  path: string;
}

export function DocumentsPanel({ stopId, slug, documents, path }: DocumentsPanelProps) {
  const [mode, setMode] = useState<"link" | "upload" | null>(null);
  const [, startTransition] = useTransition();

  return (
    <Card>
      <SectionHeader
        title="Documentos"
        count={documents.length > 0 ? documents.length : undefined}
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

      {documents.length === 0 && (
        <p className="text-sand-600 text-sm">
          Sin documentos. Agregá links o subí PDFs e imágenes.
        </p>
      )}

      <div className="space-y-2">
        {documents.map((doc) => {
          const Icon = KIND_ICON[doc.kind] ?? FileText;
          return (
            <div
              key={doc.id}
              className="flex items-center gap-3 p-2.5 rounded-xl bg-sand-850/40 border border-sand-800"
            >
              <Icon
                size={18}
                strokeWidth={1.5}
                aria-hidden="true"
                className="text-sand-500 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sand-200 truncate">
                  {doc.label}
                </p>
                <p className="text-xs text-sand-600">
                  {KIND_LABEL[doc.kind] ?? doc.kind}
                </p>
              </div>
              <a
                href={`/api/documents/${doc.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-gold-400 hover:text-gold-300 shrink-0 transition-colors inline-flex items-center gap-0.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold-400 rounded"
                aria-label={`Abrir ${doc.label} en nueva pestaña`}
              >
                Ver
                <ArrowUpRight size={12} strokeWidth={1.5} aria-hidden="true" />
              </a>
              <button
                onClick={() => startTransition(() => deleteDocument(doc.id, path))}
                aria-label={`Borrar documento "${doc.label}"`}
                className="p-1.5 rounded-lg text-sand-700 hover:text-danger hover:bg-danger-bg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400"
              >
                <Trash2 size={14} strokeWidth={1.5} aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>

      {mode === "link" && (
        <AddLinkModal
          stopId={stopId}
          slug={slug}
          onClose={() => setMode(null)}
        />
      )}
      {mode === "upload" && (
        <UploadModal
          stopId={stopId}
          onClose={() => setMode(null)}
        />
      )}
    </Card>
  );
}

function AddLinkModal({
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
      createDocumentLink(formData).then(onClose);
    });
  }

  return (
    <Modal title="Agregar link" onClose={onClose}>
      <form action={handleSubmit} className="space-y-3">
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

function UploadModal({
  stopId, onClose,
}: {
  stopId: string | null; onClose: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [label, setLabel] = useState("");
  const [kind, setKind] = useState("other");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file || !label) return;
    setUploading(true);
    const fd = new FormData();
    fd.set("file", file);
    fd.set("label", label);
    fd.set("kind", kind);
    if (stopId) fd.set("stopId", stopId);
    await fetch("/api/documents/upload", { method: "POST", body: fd });
    setUploading(false);
    window.location.reload();
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
          <label className="text-xs font-medium text-sand-400">Archivo</label>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            className="mt-1 w-full text-sm text-sand-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-sand-800 file:text-sand-200 hover:file:bg-sand-700 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 rounded-xl"
          />
        </div>
        <div className="flex gap-2 pt-1">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            className="flex-1"
            onClick={handleUpload}
            disabled={uploading || !label}
          >
            {uploading ? "Subiendo..." : "Subir"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
