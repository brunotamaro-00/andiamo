"use client";

import { useEffect, useState } from "react";
import { Download, Plane, Share, SquarePlus, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "andiamo:install-dismissed";

/** iOS Safari never fires `beforeinstallprompt`, so the banner shows there
 *  too and its CTA opens a step-by-step "Agregar a inicio" sheet instead. */
function isIosSafari(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  const isIos =
    /iphone|ipad|ipod/i.test(ua) ||
    // iPadOS 13+ reports as Mac with touch support
    (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
  const isOtherBrowser = /crios|fxios|edgios/i.test(ua);
  return isIos && !isOtherBrowser;
}

/**
 * InstallPrompt — branded install banner. Hides when:
 *   - The app is already running in standalone mode (already installed)
 *   - The user dismissed the banner (persisted in localStorage across sessions)
 *   - No install path exists (desktop browsers without PWA support)
 * On Chromium it drives the native `beforeinstallprompt`; on iOS Safari it
 * opens a sheet with the manual "Compartir → Agregar a inicio" steps.
 */
export function InstallPrompt() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [showIosSteps, setShowIosSteps] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(DISMISSED_KEY) === "1";
  });

  const isStandalone =
    typeof window !== "undefined" &&
    (window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in window.navigator &&
        (window.navigator as { standalone?: boolean }).standalone === true));

  useEffect(() => {
    function handler(e: Event) {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", handler);
    // Deferred a frame so SSR and hydration agree (banner hidden first).
    const frame = requestAnimationFrame(() => setIos(isIosSafari()));
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  if (isStandalone || dismissed || (!prompt && !ios)) return null;

  function dismiss() {
    try { localStorage.setItem(DISMISSED_KEY, "1"); } catch {}
    setDismissed(true);
  }

  async function handleInstall() {
    if (ios && !prompt) {
      setShowIosSteps(true);
      return;
    }
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") setPrompt(null);
    else dismiss();
  }

  return (
    <>
      <div
        role="region"
        aria-label="Instalar Andiamo como app"
        className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] inset-x-4 z-50 flex items-center gap-3 bg-surface border border-border card-shadow-lg rounded-xl px-4 py-3 animate-slide-up"
      >
        <Plane size={22} strokeWidth={1.5} className="shrink-0 text-brick" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-ink leading-tight">Instalá Andiamo</p>
          <p className="text-xs text-ink-2 mt-0.5">Accedé offline, sin browser.</p>
        </div>
        <button
          onClick={handleInstall}
          aria-label="Instalar"
          className="flex items-center gap-1.5 min-h-[44px] px-3 bg-brick text-surface text-xs font-display uppercase tracking-wide rounded-[6px] hard-shadow-ink active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all duration-150 shrink-0"
        >
          <Download size={13} strokeWidth={1.5} aria-hidden="true" />
          Instalar
        </button>
        <button
          onClick={dismiss}
          aria-label="Cerrar aviso de instalación"
          className="h-11 w-11 -mr-2 flex items-center justify-center text-ink-3 hover:text-ink rounded-lg transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick/40"
        >
          <X size={15} strokeWidth={1.5} aria-hidden="true" />
        </button>
      </div>

      {showIosSteps && (
        <Modal title="Agregar a inicio" onClose={() => setShowIosSteps(false)}>
          <ol className="space-y-4">
            <li className="flex items-start gap-3">
              <span className="flex items-center justify-center w-9 h-9 shrink-0 rounded-2xl bg-surface-2 border border-border">
                <Share size={17} strokeWidth={1.5} className="text-brick" aria-hidden="true" />
              </span>
              <p className="text-sm text-ink-2 pt-1.5">
                Tocá <strong className="text-ink">Compartir</strong> en la barra de Safari.
              </p>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex items-center justify-center w-9 h-9 shrink-0 rounded-2xl bg-surface-2 border border-border">
                <SquarePlus size={17} strokeWidth={1.5} className="text-brick" aria-hidden="true" />
              </span>
              <p className="text-sm text-ink-2 pt-1.5">
                Elegí <strong className="text-ink">Agregar a pantalla de inicio</strong>.
              </p>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex items-center justify-center w-9 h-9 shrink-0 rounded-2xl bg-surface-2 border border-border">
                <Plane size={17} strokeWidth={1.5} className="text-brick" aria-hidden="true" />
              </span>
              <p className="text-sm text-ink-2 pt-1.5">
                Abrí <strong className="text-ink">Andiamo</strong> desde el ícono — funciona offline.
              </p>
            </li>
          </ol>
          <Button
            variant="primary"
            className="w-full"
            onClick={() => {
              setShowIosSteps(false);
              dismiss();
            }}
          >
            Listo
          </Button>
        </Modal>
      )}
    </>
  );
}
