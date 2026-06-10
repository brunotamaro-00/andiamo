"use client";

import { useSyncExternalStore } from "react";
import { WifiOff } from "lucide-react";

function subscribe(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getSnapshot() {
  return navigator.onLine;
}

// Server snapshot: assume online so SSR/hydration never flashes the banner.
function getServerSnapshot() {
  return true;
}

/** Thin global banner shown while the device is offline — the app keeps
 *  working from the service worker cache, this just makes that visible. */
export function OfflineBanner() {
  const online = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  if (online) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-[2000] bg-warning-bg border-b-2 border-warning/40 px-4 pb-1.5 pt-[calc(0.375rem+env(safe-area-inset-top))] flex items-center justify-center gap-1.5 animate-fade-in"
    >
      <WifiOff size={12} strokeWidth={2} aria-hidden="true" className="text-warning shrink-0" />
      <span className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-warning">
        Sin conexión — viendo datos guardados
      </span>
    </div>
  );
}
