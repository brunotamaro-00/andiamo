import { describe, expect, it } from "vitest";
import { shiftOrders, PARKED_ORDER } from "./stop-order";

interface Row {
  id: string;
  order: number;
}

interface OrderRange {
  gte?: number;
  gt?: number;
  lte?: number;
  lt?: number;
}

/**
 * In-memory stand-in for the Prisma tx that enforces the unique constraint on
 * `order`, so these tests fail if the two-pass parking technique ever regresses.
 */
function makeTx(initial: Row[]) {
  const rows = initial.map((r) => ({ ...r }));

  const matches = (order: number, range: OrderRange) =>
    (range.gte === undefined || order >= range.gte) &&
    (range.gt === undefined || order > range.gt) &&
    (range.lte === undefined || order <= range.lte) &&
    (range.lt === undefined || order < range.lt);

  const stop = {
    findMany: async ({
      where,
      orderBy,
    }: {
      where: { order: OrderRange };
      select: unknown;
      orderBy: { order: "asc" | "desc" };
    }) => {
      const found = rows.filter((r) => matches(r.order, where.order)).map((r) => ({ ...r }));
      found.sort((a, b) => (orderBy.order === "asc" ? a.order - b.order : b.order - a.order));
      return found;
    },
    update: async ({ where, data }: { where: { id: string }; data: { order: number } }) => {
      if (rows.some((r) => r.id !== where.id && r.order === data.order)) {
        throw new Error(`unique constraint violation: order ${data.order}`);
      }
      const row = rows.find((r) => r.id === where.id);
      if (!row) throw new Error(`stop not found: ${where.id}`);
      row.order = data.order;
      return { ...row };
    },
  };

  /** ids sorted by current order — what the user would see */
  const sequence = () => [...rows].sort((a, b) => a.order - b.order).map((r) => r.id);
  const orders = () =>
    Object.fromEntries([...rows].sort((a, b) => a.order - b.order).map((r) => [r.id, r.order]));

  return { tx: { stop } as unknown as Parameters<typeof shiftOrders>[0], stop, sequence, orders };
}

const five = () => [
  { id: "a", order: 1 },
  { id: "b", order: 2 },
  { id: "c", order: 3 },
  { id: "d", order: 4 },
  { id: "e", order: 5 },
];

describe("shiftOrders", () => {
  it("opens a gap for an insert without leaving a residual offset", async () => {
    const { tx, orders } = makeTx(five());
    await shiftOrders(tx, { gte: 3 }, +1);
    expect(orders()).toEqual({ a: 1, b: 2, c: 4, d: 5, e: 6 });
  });

  it("closes the gap left by a delete", async () => {
    const { tx, orders } = makeTx([
      { id: "a", order: 1 },
      { id: "c", order: 3 },
      { id: "d", order: 4 },
      { id: "e", order: 5 },
    ]);
    await shiftOrders(tx, { gt: 2 }, -1);
    expect(orders()).toEqual({ a: 1, c: 2, d: 3, e: 4 });
  });

  it("does not trip the unique constraint when every slot in the range is occupied", async () => {
    const { tx, orders } = makeTx(five());
    await expect(shiftOrders(tx, { gte: 1 }, +1)).resolves.toBeUndefined();
    expect(orders()).toEqual({ a: 2, b: 3, c: 4, d: 5, e: 6 });
  });

  it("is a no-op when nothing matches the range", async () => {
    const { tx, orders } = makeTx(five());
    await shiftOrders(tx, { gt: 100 }, +1);
    expect(orders()).toEqual({ a: 1, b: 2, c: 3, d: 4, e: 5 });
  });

  it("handles legacy rows with large non-contiguous orders", async () => {
    const { tx, sequence } = makeTx([
      { id: "a", order: 1 },
      { id: "b", order: 2 },
      { id: "c", order: 10003 },
      { id: "d", order: 10004 },
    ]);
    // Insert after b: open a gap at 3
    await shiftOrders(tx, { gte: 3 }, +1);
    expect(sequence()).toEqual(["a", "b", "c", "d"]);
  });
});

describe("moveStop order choreography (park + shift + place)", () => {
  async function move(rows: Row[], id: string, afterOrder: number) {
    const { tx, stop, sequence } = makeTx(rows);
    const current = rows.find((r) => r.id === id)!.order;
    // Mirrors the transaction body of the moveStop server action
    await stop.update({ where: { id }, data: { order: PARKED_ORDER } });
    if (afterOrder > current) {
      await shiftOrders(tx, { gt: current, lte: afterOrder }, -1);
      await stop.update({ where: { id }, data: { order: afterOrder } });
    } else {
      await shiftOrders(tx, { gt: afterOrder, lt: current }, +1);
      await stop.update({ where: { id }, data: { order: afterOrder + 1 } });
    }
    return sequence();
  }

  it("moves a stop down past its successors", async () => {
    expect(await move(five(), "b", 4)).toEqual(["a", "c", "d", "b", "e"]);
  });

  it("moves a stop up before its predecessors", async () => {
    expect(await move(five(), "d", 1)).toEqual(["a", "d", "b", "c", "e"]);
  });

  it("moves a stop to the very start", async () => {
    expect(await move(five(), "e", 0)).toEqual(["e", "a", "b", "c", "d"]);
  });

  it("moves a stop to the very end", async () => {
    expect(await move(five(), "a", 5)).toEqual(["b", "c", "d", "e", "a"]);
  });
});
