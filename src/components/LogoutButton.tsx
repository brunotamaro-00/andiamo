"use client";

import { useTransition } from "react";
import { logout } from "@/app/actions/auth";

/** Asks the service worker to drop every cache before the cookie is cleared,
 *  so cached authenticated pages can't be served after logout. Resolves after
 *  1s even without an answer to never block the logout itself. */
async function clearSwCaches(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.ready;
  if (!registration.active) return;
  await new Promise<void>((resolve) => {
    const channel = new MessageChannel();
    const timer = setTimeout(resolve, 1000);
    channel.port1.onmessage = () => {
      clearTimeout(timer);
      resolve();
    };
    registration.active!.postMessage({ type: "CLEAR_ALL_CACHES" }, [channel.port2]);
  });
}

export function LogoutButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await clearSwCaches().catch(() => {});
          await logout();
        })
      }
      className="min-h-[44px] text-[11px] font-extrabold uppercase tracking-[0.08em] text-ink-3 hover:text-ink-2 transition-colors duration-150 px-3 rounded-full hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick/40 disabled:opacity-50"
    >
      Salir
    </button>
  );
}
