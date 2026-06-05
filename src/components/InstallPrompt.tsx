"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * InstallPrompt — captures the `beforeinstallprompt` event and shows a
 * branded install banner. Hides when:
 *   - The app is already running in standalone mode (already installed)
 *   - The user dismissed the banner this session
 *   - No PWA install prompt is available (iOS, desktop with extensions, etc.)
 */
export function InstallPrompt() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

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
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (isStandalone || !prompt || dismissed) return null;

  async function handleInstall() {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") setPrompt(null);
    else setDismissed(true);
  }

  return (
    <div
      role="banner"
      aria-label="Instalar Andiamo como app"
      className="fixed bottom-20 inset-x-4 z-50 flex items-center gap-3 bg-surface border-2 border-border card-shadow-lg rounded-[4px] px-4 py-3 animate-slide-up"
    >
      <span className="text-2xl shrink-0" aria-hidden="true">✈️</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-ink leading-tight">Instalá Andiamo</p>
        <p className="text-xs text-ink-2 mt-0.5">Accedé offline, sin browser.</p>
      </div>
      <button
        onClick={handleInstall}
        aria-label="Instalar"
        className="flex items-center gap-1.5 px-3 py-1.5 bg-brick text-surface text-xs font-display uppercase tracking-wide rounded-[2px] hard-shadow-ink active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all duration-150 shrink-0"
      >
        <Download size={13} strokeWidth={1.5} aria-hidden="true" />
        Instalar
      </button>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Cerrar aviso de instalación"
        className="text-ink-3 hover:text-ink p-1 rounded-lg transition-colors shrink-0"
      >
        <X size={15} strokeWidth={1.5} aria-hidden="true" />
      </button>
    </div>
  );
}
