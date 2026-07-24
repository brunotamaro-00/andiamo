"use client";

import { useEffect, useState } from "react";
import { CloudDownload, Check, Loader2, WifiOff } from "lucide-react";
import { Card, SectionHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { MutationErrorBanner } from "@/components/ui/MutationErrorBanner";
import { useToast } from "@/components/ui/Toast";
import { haptics } from "@/lib/haptics";

/* "Descargar viaje": warms the service worker caches with every stop/guide
 * page and every uploaded document so the trip is readable in airplane mode.
 * The heavy download (documents included) is manual by design; route freshness
 * while online is handled automatically by the SW's network-first navigation. */

const LS_KEY = "andiamo:trip-downloaded";

interface DownloadedMeta {
  at: number;
  bytes: number;
}

interface Progress {
  done: number;
  total: number;
  bytes: number;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

function formatSince(at: number): string {
  const mins = Math.round((Date.now() - at) / 60000);
  if (mins < 1) return "recién";
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  return `hace ${days} d`;
}

async function getController(): Promise<ServiceWorker | null> {
  if (!("serviceWorker" in navigator)) return null;
  if (navigator.serviceWorker.controller) return navigator.serviceWorker.controller;
  const reg = await navigator.serviceWorker.ready.catch(() => null);
  return reg?.active ?? null;
}

export function DownloadTripButton() {
  const { toast } = useToast();
  const [status, setStatus] = useState<"idle" | "downloading">("idle");
  const [progress, setProgress] = useState<Progress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<DownloadedMeta | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration-safe read of a client-only value
      if (raw) setMeta(JSON.parse(raw) as DownloadedMeta);
    } catch {
      /* ignore corrupt/absent value */
    }
  }, []);

  async function handleDownload() {
    if (status === "downloading") return;
    setError(null);

    const controller = await getController();
    if (!controller) {
      setError("El modo offline todavía no está listo. Recargá la app e intentá de nuevo.");
      return;
    }

    setStatus("downloading");
    setProgress({ done: 0, total: 0, bytes: 0 });
    haptics.tap();

    try {
      const res = await fetch("/api/offline/manifest");
      if (!res.ok) throw new Error("manifest");
      const { routes, docs } = (await res.json()) as { routes: string[]; docs: string[] };

      await new Promise<void>((resolve, reject) => {
        const channel = new MessageChannel();
        channel.port1.onmessage = (event) => {
          const data = event.data;
          if (data?.error) {
            reject(new Error(data.error));
            return;
          }
          if (typeof data?.done === "number" && typeof data?.total === "number") {
            setProgress({ done: data.done, total: data.total, bytes: data.bytes ?? 0 });
          }
          if (data?.finished) {
            const saved: DownloadedMeta = { at: Date.now(), bytes: data.bytes ?? 0 };
            try {
              localStorage.setItem(LS_KEY, JSON.stringify(saved));
            } catch {
              /* storage may be full — the cache still succeeded */
            }
            setMeta(saved);
            resolve();
          }
        };
        controller.postMessage({ type: "PRECACHE_TRIP", routes, docs }, [channel.port2]);
      });

      haptics.success();
      toast("Viaje descargado para offline");
    } catch {
      haptics.error();
      setError("No se pudo descargar todo. Revisá la conexión e intentá de nuevo.");
    } finally {
      setStatus("idle");
      setProgress(null);
    }
  }

  const downloading = status === "downloading";
  const pct = progress && progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <Card>
      <SectionHeader title="Offline" />

      <MutationErrorBanner message={error} />

      <p className="text-sm text-ink-2">
        Descargá paradas, guías y documentos para leerlos sin conexión (en avión o sin datos).
      </p>

      {meta && !downloading && (
        <p className="mt-2 flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.08em] text-success">
          <Check size={13} strokeWidth={2.5} aria-hidden="true" />
          Descargado {formatSince(meta.at)} · {formatBytes(meta.bytes)}
        </p>
      )}

      {downloading && progress && (
        <div className="mt-3" aria-live="polite">
          <div className="mb-1 flex items-center justify-between text-[11px] text-ink-3">
            <span>
              Descargando {progress.done}/{progress.total || "…"}
            </span>
            <span>{formatBytes(progress.bytes)}</span>
          </div>
          <ProgressBar value={pct} fillClass="bg-brick" />
        </div>
      )}

      <div className="mt-3">
        <Button
          variant="primary"
          className="w-full"
          onClick={handleDownload}
          disabled={downloading}
        >
          {downloading ? (
            <>
              <Loader2 size={15} className="animate-spin" aria-hidden="true" />
              Descargando…
            </>
          ) : (
            <>
              <CloudDownload size={15} strokeWidth={2} aria-hidden="true" />
              {meta ? "Actualizar descarga" : "Descargar viaje"}
            </>
          )}
        </Button>
      </div>

      <p className="mt-2 flex items-center gap-1.5 text-[11px] text-ink-faint">
        <WifiOff size={12} strokeWidth={2} aria-hidden="true" />
        Offline es solo lectura — para editar necesitás conexión.
      </p>
    </Card>
  );
}
