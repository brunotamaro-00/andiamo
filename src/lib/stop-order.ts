/**
 * stop-order.ts — helper for reordering stops with the unique-constraint-safe
 * two-pass offset technique.
 *
 * Prisma transactions (tx) are passed in so callers control the transaction boundary.
 */

import type { PrismaClient } from "@/generated/prisma/client";
export type Tx = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

/** Temporary slot for a stop being moved — real orders are always positive. */
export const PARKED_ORDER = -1;

interface OrderRange {
  gte?: number;
  gt?: number;
  lte?: number;
  lt?: number;
}

/**
 * Shifts the `order` of all stops matching `range` by `delta` (+1 or -1),
 * using a two-pass approach to avoid unique-constraint violations:
 *   pass 1 → park every matched stop at a unique negative order (never
 *            collides with real values, which are positive, nor with
 *            PARKED_ORDER used by moveStop)
 *   pass 2 → set the final value (original + delta)
 */
export async function shiftOrders(tx: Tx, range: OrderRange, delta: number): Promise<void> {
  const stops = await tx.stop.findMany({
    where: { order: range },
    select: { id: true, order: true },
    orderBy: { order: "asc" },
  });
  if (stops.length === 0) return;

  // Two passes, but batched per pass instead of one awaited update per stop.
  // Sequentially that was 2N round-trips inside an interactive transaction
  // (5s default timeout): inserting at the head of a 30-stop itinerary meant 60
  // of them, which flirts with P2028 "Transaction already closed" over a remote
  // DB link. Prisma sends each pass as one batch, and the passes stay ordered.
  await Promise.all(
    stops.map((s, i) => tx.stop.update({ where: { id: s.id }, data: { order: -(i + 2) } })),
  );
  await Promise.all(
    stops.map((s) => tx.stop.update({ where: { id: s.id }, data: { order: s.order + delta } })),
  );
}
