"use client";

import { useEffect, useState } from "react";
import { CloudDownload, Check, Loader2, WifiOff } from "lucide-react";
import { Card, SectionHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { MutationErrorBanner } from "@/components/ui/MutationErrorBanner";
import { useToast } from "@/components/ui/Toast";
import { fetchWithTimeout, TIMEOUT_INTERACTIVE_MS } from "@/lib/fetch-timeout";
import { haptics } from "@/lib/haptics";
import { precacheOutcome } from "@/lib/offline-download";

/* "Descargar viaje": warms the service worker caches with every stop/guide
 * page and every uploaded document so the trip is readable in airplane mode.
 * The heavy download (documents included) is manual by design; route freshness
 * while online is handled automatically by the SW's network-first navigation. */

const LS_KEY = "andiamo:trip-downloaded";

/** Give up if the service worker goes this long without reporting progress.
 *  Generous: the pool reports after every single file, so real silence means
 *  the SW is gone, not that the download is slow. */
const STALL_TIMEOUT_MS = 30_000;

/** The download finished but some files never made it into the cache *for a
 *  reason a retry can fix* — quota, a timeout, the network dropping. See
 *  `precacheOutcome`: orphaned (`gone`) docs are not this. */
class PartialDownloadError extends Error {
  constructor(readonly failed: number, readonly total: number) {
    super(`partial: ${failed}/${total}`);
    this.name = "PartialDownloadError";
  }
}

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

/** How long to wait for a service worker that is still installing. `ready` never
 *  rejects: if `install` stalls (it precaches the shell over the network), it
 *  simply never settles, and awaiting it left the button dead — no spinner, no
 *  error, nothing to retry. The SW now bounds its own install fetches too, but
 *  the UI must not depend on that to stay responsive. */
const CONTROLLER_TIMEOUT_MS = 10_000;

async function getController(): Promise<ServiceWorker | null> {
  if (!("serviceWorker" in navigator)) return null;
  if (navigator.serviceWorker.controller) return navigator.serviceWorker.controller;
  const reg = await Promise.race([
    navigator.serviceWorker.ready.catch(() => null),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), CONTROLLER_TIMEOUT_MS)),
  ]);
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

    let gone = 0;
    try {
      // The manifest fetch used to sit outside the watchdog below AND have no
      // deadline of its own, so a socket that stalled here left the button on
      // "Descargando…" and `disabled` permanently — precisely the state the
      // watchdog exists to prevent.
      const res = await fetchWithTimeout("/api/offline/manifest", {}, TIMEOUT_INTERACTIVE_MS);
      if (!res.ok) throw new Error("manifest");
      const { routes, docs } = (await res.json()) as { routes: string[]; docs: string[] };

      await new Promise<void>((resolve, reject) => {
        const channel = new MessageChannel();

        // Stall watchdog. If the SW dies, gets replaced mid-download, or never
        // posts { finished }, this promise used to hang forever and left the
        // button stuck on "Descargando…" with no way to retry but a reload.
        // Reset on every message, so a slow-but-progressing download is fine.
        let stallTimer: ReturnType<typeof setTimeout>;

        // Always tear the channel down: leaving the ports open kept both this
        // one and the SW's precache alive for the life of the page on every
        // abandoned attempt.
        const close = () => {
          clearTimeout(stallTimer);
          channel.port1.onmessage = null;
          channel.port1.close();
        };
        const settle = (fn: () => void) => {
          close();
          fn();
        };

        const armWatchdog = () => {
          clearTimeout(stallTimer);
          stallTimer = setTimeout(
            () => settle(() => reject(new Error("stalled"))),
            STALL_TIMEOUT_MS,
          );
        };

        channel.port1.onmessage = (event) => {
          const data = event.data;
          armWatchdog();
          if (data?.error) {
            settle(() => reject(new Error(data.error)));
            return;
          }
          if (typeof data?.done === "number" && typeof data?.total === "number") {
            setProgress({ done: data.done, total: data.total, bytes: data.bytes ?? 0 });
          }
          if (data?.finished) {
            const outcome = precacheOutcome(data);
            if (outcome.status === "fatal") {
              settle(() => reject(new PartialDownloadError(outcome.failed, outcome.total)));
              return;
            }
            gone = outcome.gone;
            const saved: DownloadedMeta = { at: Date.now(), bytes: outcome.bytes };
            try {
              localStorage.setItem(LS_KEY, JSON.stringify(saved));
            } catch {
              /* storage may be full — the cache still succeeded */
            }
            setMeta(saved);
            settle(resolve);
          }
        };

        armWatchdog();
        controller.postMessage({ type: "PRECACHE_TRIP", routes, docs }, [channel.port2]);
      });

      haptics.success();
      toast(
        gone > 0
          ? `Viaje descargado · ${gone} ${gone === 1 ? "archivo ya no existe" : "archivos ya no existen"}`
          : "Viaje descargado para offline",
      );
    } catch (e) {
      haptics.error();
      setError(
        e instanceof PartialDownloadError
          ? `Quedaron ${e.failed} de ${e.total} sin guardar (puede ser falta de espacio). Liberá espacio e intentá de nuevo.`
          : e instanceof Error && e.message === "stalled"
            ? "La descarga se quedó sin respuesta. Recargá la app e intentá de nuevo."
            : "No se pudo descargar todo. Revisá la conexión e intentá de nuevo.",
      );
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
        <p className="mt-2 flex items-center gap-1.5 label-caps text-success">
          <Check size={13} strokeWidth={2.5} aria-hidden="true" />
          Descargado {formatSince(meta.at)} · {formatBytes(meta.bytes)}
        </p>
      )}

      {downloading && progress && (
        <div className="mt-3" aria-live="polite">
          <div className="mb-1 flex items-center justify-between text-caption text-ink-3">
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

      <p className="mt-2 flex items-center gap-1.5 text-caption text-ink-3">
        <WifiOff size={12} strokeWidth={2} aria-hidden="true" />
        Offline es solo lectura — para editar necesitás conexión.
      </p>
    </Card>
  );
}
