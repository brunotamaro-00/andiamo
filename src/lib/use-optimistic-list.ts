"use client";

import { useState, useTransition, useOptimistic } from "react";
import { useRouter } from "next/navigation";

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

  /** Apply an optimistic update and call `serverAction`.
   *  On failure, sets `mutationError` and refreshes the page to roll back. */
  function mutate(
    optimisticAction: A,
    serverAction: () => Promise<unknown>,
    errorMsg: string,
  ) {
    setMutationError(null);
    startTransition(async () => {
      applyOptimistic(optimisticAction);
      try {
        await serverAction();
      } catch {
        setMutationError(errorMsg);
        router.refresh();
      }
    });
  }

  return {
    items: optimisticItems,
    mutate,
    mutationError,
    clearError: () => setMutationError(null),
    isPending,
    applyOptimistic,
    startTransition,
  };
}
