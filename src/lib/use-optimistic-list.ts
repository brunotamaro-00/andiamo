"use client";

import { useState, useTransition, useOptimistic } from "react";
import { useRouter } from "next/navigation";
import { haptics } from "./haptics";

/**
 * useOptimisticList — shared hook for panels that manage a list with optimistic mutations.
 *
 * Encapsulates the useOptimistic + useTransition + mutationError + router.refresh()
 * boilerplate that was duplicated across NotesPanel and DocumentsPanel.
 *
 * Usage:
 *   const { items, mutate, mutationError, clearError, isPending } = useOptimisticList(
 *     serverItems,
 *     (state, action: MyAction) => { ... }  // optimistic reducer
 *   );
 *   // Then: mutate({ type: "delete", id }, () => deleteItem(id), "No se pudo borrar.");
 */
export function useOptimisticList<T, A>(
  serverItems: T[],
  reducer: (state: T[], action: A) => T[],
) {
  const router = useRouter();
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [optimisticItems, applyOptimistic] = useOptimistic(serverItems, reducer);

  /** Server actions signal validation failure by resolving `{ error }` instead of throwing. */
  function resolvedError(result: unknown): boolean {
    return typeof result === "object" && result !== null && "error" in result &&
      Boolean((result as { error?: unknown }).error);
  }

  /** Shared failure path.
   *
   *  `reachedServer` decides whether to reconcile. It must: offline, an RSC
   *  fetch fails and the App Router falls back to a **full browser navigation**
   *  ("Failed to fetch RSC payload … Falling back to browser navigation"). That
   *  reloads the page and destroys all client state — the open sheet, the text
   *  the user just typed, and this very error message. The page simply blinked
   *  and the note was gone.
   *
   *  A thrown action never reached the server, so there is nothing to reconcile
   *  anyway: `useOptimistic` reverts on its own when the transition ends. Only a
   *  resolved `{ error }` means the server answered and its state may differ
   *  from ours — and if it answered, we are online and refresh is safe. */
  function fail(errorMsg: string, onError?: (m: string) => void, reachedServer = false) {
    haptics.error();
    setMutationError(errorMsg);
    onError?.(errorMsg);
    if (reachedServer) router.refresh();
  }

  /** Apply an optimistic update and call `serverAction`.
   *  On failure (thrown or resolved `{ error }`), sets `mutationError` and
   *  refreshes the page to roll back. `onSuccess` fires only after the action
   *  resolved without error — use it for confirmation toasts.
   *
   *  `onError` is what lets a sheet stay open on failure. Panels used to close
   *  the modal *before* calling this, so when the mutation failed on hostel wifi
   *  the optimistic row was reverted, a "Reintentá" banner appeared, and the 400
   *  characters the user had just typed were gone with the unmounted form —
   *  there was nothing left to retry with. Close on success, report on failure. */
  function mutate(
    optimisticAction: A,
    serverAction: () => Promise<unknown>,
    errorMsg: string,
    onSuccess?: () => void,
    onError?: (message: string) => void,
  ) {
    setMutationError(null);
    startTransition(async () => {
      applyOptimistic(optimisticAction);
      let reachedServer = false;
      try {
        if (resolvedError(await serverAction())) {
          reachedServer = true;
          throw new Error(errorMsg);
        }
        onSuccess?.();
      } catch {
        fail(errorMsg, onError, reachedServer);
      }
    });
  }

  /** Call `serverAction` inside the shared transition without an optimistic
   *  update — for mutations whose result can't be predicted locally (edits). */
  function run(
    serverAction: () => Promise<unknown>,
    errorMsg: string,
    onSuccess?: () => void,
    onError?: (message: string) => void,
  ) {
    setMutationError(null);
    startTransition(async () => {
      let reachedServer = false;
      try {
        if (resolvedError(await serverAction())) {
          reachedServer = true;
          throw new Error(errorMsg);
        }
        onSuccess?.();
      } catch {
        fail(errorMsg, onError, reachedServer);
      }
    });
  }

  return {
    items: optimisticItems,
    mutate,
    run,
    mutationError,
    clearError: () => setMutationError(null),
    isPending,
    applyOptimistic,
    startTransition,
  };
}
