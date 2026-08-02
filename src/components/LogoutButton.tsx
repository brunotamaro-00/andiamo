"use client";

import { useTransition } from "react";
import { logout } from "@/app/actions/auth";

/** Total budget for the cache wipe. Logging out must never be blocked by the
 *  service worker, and `navigator.serviceWorker.ready` is the trap: it does not
 *  reject, it just never settles while `install` is stuck fetching the shell. So
 *  the 1 s answer timer below — armed only *after* that await — could not save
 *  us, and neither could `.catch()`. "Salir" stayed disabled forever. Bound the
 *  whole thing, not just the reply. */
const WIPE_BUDGET_MS = 2_000;

/** Asks the service worker to drop every cache before the cookie is cleared,
 *  so cached authenticated pages can't be served after logout. */
async function clearSwCaches(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.ready;
  if (!registration.active) return;
  await new Promise<void>((resolve) => {
    const channel = new MessageChannel();
    const done = () => {
      clearTimeout(timer);
      channel.port1.onmessage = null;
      channel.port1.close();
      resolve();
    };
    const timer = setTimeout(done, 1000);
    channel.port1.onmessage = done;
    registration.active!.postMessage({ type: "CLEAR_ALL_CACHES" }, [channel.port2]);
  });
}

/** `clearSwCaches` that always settles, whatever the service worker is doing. */
function clearSwCachesBounded(): Promise<void> {
  return Promise.race([
    clearSwCaches().catch(() => {}),
    new Promise<void>((resolve) => setTimeout(resolve, WIPE_BUDGET_MS)),
  ]);
}

export function LogoutButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await clearSwCachesBounded();
          await logout();
        })
      }
      className="min-h-[44px] label-caps text-ink-3 hover:text-ink-2 transition-colors duration-150 px-3 rounded-full hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brick/40 disabled:opacity-50"
    >
      Salir
    </button>
  );
}
