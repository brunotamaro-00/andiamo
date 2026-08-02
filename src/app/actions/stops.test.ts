import { describe, expect, it, vi, beforeEach } from "vitest";

const revalidatePath = vi.fn();
const redirect = vi.fn((url: string) => {
  const err = new Error(`NEXT_REDIRECT:${url}`);
  // Next's redirect throws; mirror that so createStop does not fall through.
  throw err;
});
const findUnique = vi.fn();
const findMany = vi.fn();
const create = vi.fn();
const update = vi.fn();
const recalculateItinerary = vi.fn();
const notifyStopsChanged = vi.fn();

vi.mock("next/cache", () => ({ revalidatePath: (...a: unknown[]) => revalidatePath(...a) }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => redirect(url) }));
vi.mock("next/server", () => ({ after: (fn: () => void) => fn() }));
vi.mock("@/lib/auth", () => ({ requireAuth: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/spitwise", () => ({
  notifyStopsChanged: () => notifyStopsChanged(),
}));
vi.mock("@/lib/itinerary", () => ({
  recalculateItinerary: (...a: unknown[]) => recalculateItinerary(...a),
}));
vi.mock("@/lib/db", () => ({
  db: {
    stop: {
      findUnique: (...a: unknown[]) => findUnique(...a),
    },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        stop: {
          findMany: (...a: unknown[]) => findMany(...a),
          create: (...a: unknown[]) => create(...a),
          update: (...a: unknown[]) => update(...a),
        },
      }),
  },
  isUniqueViolation: () => false,
  isRecordMissing: () => false,
}));

import { createStop } from "./stops";

function form(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  findUnique.mockResolvedValue(null); // uniqueSlug: name is free
  findMany.mockResolvedValue([]); // shiftOrders: nothing to move
  create.mockResolvedValue({ id: "new" });
  recalculateItinerary.mockResolvedValue({});
});

describe("createStop revalidations", () => {
  it("revalida /stops, todos los detail pages y /search después de recalcular fechas", async () => {
    // recalculateItinerary rewrites arrival/departure of every stop after the
    // insert point. Without revalidating /stops/[slug] those detail pages keep
    // the old arrival and countdown for the whole staleTimes window; without
    // /search the city just added is not findable by name.
    await expect(
      createStop(
        form({
          name: "Brujas",
          country: "Bélgica",
          countryCode: "BE",
          latitude: "51.2093",
          longitude: "3.2247",
          timezone: "Europe/Brussels",
          nights: "3",
          insertAfterOrder: "1",
          isCandidate: "false",
        }),
      ),
    ).rejects.toThrow(/NEXT_REDIRECT:\/stops\/brujas/);

    expect(recalculateItinerary).toHaveBeenCalledOnce();
    expect(revalidatePath).toHaveBeenCalledWith("/stops");
    expect(revalidatePath).toHaveBeenCalledWith("/stops/[slug]", "page");
    expect(revalidatePath).toHaveBeenCalledWith("/search");
    expect(redirect).toHaveBeenCalledWith("/stops/brujas");
  });

  it("no revalida si el formulario es inválido", async () => {
    const result = await createStop(form({ name: "" }));
    expect(result).toEqual(expect.objectContaining({ error: expect.any(String) }));
    expect(revalidatePath).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });
});
