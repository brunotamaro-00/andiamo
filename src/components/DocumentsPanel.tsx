"use client";

import { useState, useTransition, useRef } from "react";
import { createDocumentLink, deleteDocument } from "@/app/actions/documents";

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

const KIND_EMOJI: Record<string, string> = {
  checkin: "🏨", voucher: "🎟️", ticket: "🎫",
  carRental: "🚗", insurance: "🛡️", flight: "✈️", other: "📄",
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
    <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Documentos {documents.length > 0 && <span className="text-slate-600 normal-case">({documents.length})</span>}
        </h2>
        <div className="flex gap-2">
          <button onClick={() => setMode("link")} className="text-xs text-sky-400 hover:text-sky-300 transition-colors">
            + Link
          </button>
          <button onClick={() => setMode("upload")} className="text-xs text-sky-400 hover:text-sky-300 transition-colors">
            + Subir
          </button>
        </div>
      </div>

      {documents.length === 0 && (
        <p className="text-slate-600 text-sm">Sin documentos. Agregá links o sube PDFs e imágenes.</p>
      )}

      <div className="space-y-2">
        {documents.map((doc) => (
          <div key={doc.id} className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-800/40 border border-slate-800">
            <span className="text-lg shrink-0">{KIND_EMOJI[doc.kind] ?? "📄"}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-200 truncate">{doc.label}</p>
              <p className="text-xs text-slate-500">{KIND_LABEL[doc.kind] ?? doc.kind}</p>
            </div>
            <a
              href={`/api/documents/${doc.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-sky-400 hover:text-sky-300 shrink-0 transition-colors"
            >
              Ver ↗
            </a>
            <button
              onClick={() => startTransition(() => deleteDocument(doc.id, path))}
              className="text-slate-700 hover:text-red-400 text-xs shrink-0 transition-colors"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {mode === "link" && (
        <AddLinkModal stopId={stopId} slug={slug} path={path} onClose={() => setMode(null)} />
      )}
      {mode === "upload" && (
        <UploadModal stopId={stopId} path={path} onClose={() => setMode(null)} />
      )}
    </div>
  );
}

function AddLinkModal({
  stopId, slug, path, onClose,
}: {
  stopId: string | null; slug: string | null; path: string; onClose: () => void;
}) {
  const [, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    if (stopId) formData.set("stopId", stopId);
    if (slug) formData.set("slug", slug);
    startTransition(() => {
      createDocumentLink(formData).then(onClose);
    });
  }

  return <Modal title="Agregar link" onClose={onClose}>
    <form action={handleSubmit} className="space-y-3">
      <div>
        <label className="text-xs text-slate-400">Etiqueta</label>
        <input type="text" name="label" required placeholder="Ej: Check-in Generator Hostel"
          className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500" />
      </div>
      <KindSelect />
      <div>
        <label className="text-xs text-slate-400">URL</label>
        <input type="url" name="url" required placeholder="https://..."
          className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500" />
      </div>
      <ModalButtons onClose={onClose} />
    </form>
  </Modal>;
}

function UploadModal({ stopId, path, onClose }: { stopId: string | null; path: string; onClose: () => void }) {
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
    // Trigger revalidation by navigating
    window.location.reload();
  }

  return <Modal title="Subir documento" onClose={onClose}>
    <div className="space-y-3">
      <div>
        <label className="text-xs text-slate-400">Etiqueta</label>
        <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ej: Voucher hostel Londres"
          className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500" />
      </div>
      <div>
        <label className="text-xs text-slate-400">Tipo</label>
        <select value={kind} onChange={(e) => setKind(e.target.value)}
          className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500">
          {DOCUMENT_KINDS.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
        </select>
      </div>
      <div>
        <label className="text-xs text-slate-400">Archivo</label>
        <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp"
          className="mt-1 w-full text-sm text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-slate-700 file:text-slate-200 hover:file:bg-slate-600 cursor-pointer" />
      </div>
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border border-slate-700 text-slate-400 text-sm hover:border-slate-500 transition-colors">
          Cancelar
        </button>
        <button onClick={handleUpload} disabled={uploading || !label}
          className="flex-1 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-sm font-medium transition-colors">
          {uploading ? "Subiendo..." : "Subir"}
        </button>
      </div>
    </div>
  </Modal>;
}

function KindSelect() {
  return (
    <div>
      <label className="text-xs text-slate-400">Tipo</label>
      <select name="kind" className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500">
        {DOCUMENT_KINDS.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
      </select>
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-slate-900 rounded-2xl p-5 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-100">{title}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ModalButtons({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex gap-2 pt-1">
      <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border border-slate-700 text-slate-400 text-sm hover:border-slate-500 transition-colors">
        Cancelar
      </button>
      <button type="submit" className="flex-1 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium transition-colors">
        Guardar
      </button>
    </div>
  );
}
