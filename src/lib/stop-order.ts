/**
 * stop-order.ts — helper for reordering stops with the unique-constraint-safe
 * two-pass offset technique.
 *
 * Prisma transactions (tx) are passed in so callers control the transaction boundary.
 */

import type { PrismaClient } from "@/generated/prisma/client";
type Tx = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

const OFFSET = 10_000;

interface OrderRange {
  gte?: number;
  gt?: number;
  lte?: number;
  lt?: number;
}

/**
 * Shifts the `order` of all stops matching `range` by `delta` (+1 or -1),
 * using a two-pass approach to avoid unique-constraint violations:
 *   pass 1 → add OFFSET to temporarily move out of the way
 *   pass 2 → set final value (original + OFFSET + delta)
 */
export async function shiftOrders(
  tx: Tx,
  range: OrderRange,
  delta: number,
  /** optional: DESC for moving up (avoids cascading unique conflicts) */
  orderDir: "asc" | "desc" = "asc",
): Promise<void> {
  const stops = await tx.stop.findMany({
    where: { order: range },
    select: { id: true, order: true },
    orderBy: { order: orderDir },
  });

  // Pass 1: move to temporary positions far from real values
  for (const s of stops) {
    await tx.stop.update({ where: { id: s.id }, data: { order: s.order + OFFSET } });
  }
  // Pass 2: set final position
  for (const s of stops) {
    await tx.stop.update({
      where: { id: s.id },
      data: { order: s.order + OFFSET + delta },
    });
  }
}
