"use client";

import { useState, useTransition, useOptimistic } from "react";
import { useRouter } from "next/navigation";
import { haptics } from "./haptics";

/**
 * useOptimisticList — shared hook for panels that manage a list with optimistic mutations.
 *
 * Encapsulates the useOptimistic + useTransition + mutationError + router.refresh()
 * boilerplate that was duplicated across NotesPanel, PoiPanel, and DocumentsPanel.
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

  /** Apply an optimistic update and call `serverAction`.
   *  On failure (thrown or resolved `{ error }`), sets `mutationError` and
   *  refreshes the page to roll back. */
  function mutate(
    optimisticAction: A,
    serverAction: () => Promise<unknown>,
    errorMsg: string,
  ) {
    setMutationError(null);
    startTransition(async () => {
      applyOptimistic(optimisticAction);
      try {
        if (resolvedError(await serverAction())) throw new Error(errorMsg);
      } catch {
        haptics.error();
        setMutationError(errorMsg);
        router.refresh();
      }
    });
  }

  /** Call `serverAction` inside the shared transition without an optimistic
   *  update — for mutations whose result can't be predicted locally (edits). */
  function run(serverAction: () => Promise<unknown>, errorMsg: string) {
    setMutationError(null);
    startTransition(async () => {
      try {
        if (resolvedError(await serverAction())) throw new Error(errorMsg);
      } catch {
        haptics.error();
        setMutationError(errorMsg);
        router.refresh();
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
