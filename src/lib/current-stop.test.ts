import { describe, expect, it, vi } from "vitest";

// The module also exports DB-backed wrappers — stub the Prisma client and the
// cookie-reading person helper (pulls in next/headers) out.
vi.mock("./db", () => ({ db: {} }));
vi.mock("./person-server", () => ({ getPerson: async () => null }));

import { computeCurrentStopSlug, type CurrentStopInput } from "./current-stop";

function stop(
  slug: string,
  order: number,
  arrival: string | null,
  departure: string | null,
  overrides: Partial<CurrentStopInput> = {},
): CurrentStopInput {
  return {
    id: `id-${slug}`,
    slug,
    order,
    nights: 2,
    isFlexMargin: false,
    ownerPerson: null,
    arrivalDate: arrival ? new Date(`${arrival}T00:00:00.000Z`) : null,
    departureDate: departure ? new Date(`${departure}T00:00:00.000Z`) : null,
    ...overrides,
  };
}

const trip = () => [
  stop("paris", 1, "2026-06-01", "2026-06-04"),
  stop("lyon", 2, "2026-06-04", "2026-06-07"),
  stop("roma", 3, "2026-06-07", "2026-06-10"),
];

describe("computeCurrentStopSlug", () => {
  it("returns the stop whose date range contains today", () => {
    expect(computeCurrentStopSlug(trip(), null, "2026-06-05")).toBe("lyon");
  });

  it("treats arrival day as current and departure day as already left", () => {
    expect(computeCurrentStopSlug(trip(), null, "2026-06-04")).toBe("lyon");
    expect(computeCurrentStopSlug(trip(), null, "2026-06-07")).toBe("roma");
  });

  it("returns the first stop before the trip starts", () => {
    expect(computeCurrentStopSlug(trip(), null, "2026-05-20")).toBe("paris");
  });

  it("returns the last dated stop after the trip ends", () => {
    expect(computeCurrentStopSlug(trip(), null, "2026-07-01")).toBe("roma");
  });

  // Regression: the "trip hasn't started" branch only looked at stops[0], so an
  // undated first stop fell through to the "trip ended" branch and sent /hoy to
  // the *last* stop months before departure.
  it("returns the first dated stop when earlier stops have no dates", () => {
    const stops = [
      stop("brujas", 1, null, null),
      stop("paris", 2, "2026-06-01", "2026-06-04"),
      stop("roma", 3, "2026-06-07", "2026-06-10"),
    ];
    expect(computeCurrentStopSlug(stops, null, "2026-05-20")).toBe("paris");
  });

  it("still falls back to the last dated stop once the trip is over", () => {
    const stops = [
      stop("brujas", 1, null, null),
      stop("paris", 2, "2026-06-01", "2026-06-04"),
    ];
    expect(computeCurrentStopSlug(stops, null, "2026-07-01")).toBe("paris");
  });

  it("honours the manual override", () => {
    expect(computeCurrentStopSlug(trip(), "id-paris", "2026-06-05")).toBe("paris");
  });

  it("falls back to date logic when the override id no longer exists", () => {
    expect(computeCurrentStopSlug(trip(), "id-gone", "2026-06-05")).toBe("lyon");
  });

  it("skips flex-margin and zero-night stops", () => {
    const stops = [
      stop("transit", 1, "2026-06-01", "2026-06-01", { nights: 0 }),
      stop("buffer", 2, "2026-06-01", "2026-06-04", { isFlexMargin: true }),
      stop("paris", 3, "2026-06-01", "2026-06-04"),
    ];
    expect(computeCurrentStopSlug(stops, null, "2026-06-02")).toBe("paris");
  });

  it("returns null for an empty list", () => {
    expect(computeCurrentStopSlug([], null, "2026-06-05")).toBeNull();
  });

  it("swaps the current stop per viewer for person-scoped overlaps", () => {
    // Bruno in Porto while Katia is in Pititas over the same window.
    const stops = [
      stop("porto", 1, "2026-06-01", "2026-06-05", { ownerPerson: "bruno" }),
      stop("pititas", 2, "2026-06-01", "2026-06-05", { ownerPerson: "katia" }),
    ];
    expect(computeCurrentStopSlug(stops, null, "2026-06-03", "bruno")).toBe("porto");
    expect(computeCurrentStopSlug(stops, null, "2026-06-03", "katia")).toBe("pititas");
    // "Ambos" sees all → first by order wins.
    expect(computeCurrentStopSlug(stops, null, "2026-06-03", null)).toBe("porto");
  });

  it("ignores an override pointing at a stop the viewer can't see", () => {
    const stops = [
      stop("porto", 1, "2026-06-01", "2026-06-05", { ownerPerson: "bruno" }),
      stop("pititas", 2, "2026-06-01", "2026-06-05", { ownerPerson: "katia" }),
    ];
    // Katia's session can't be pinned to Porto — falls back to her visible set.
    expect(computeCurrentStopSlug(stops, "id-porto", "2026-06-03", "katia")).toBe("pititas");
  });
});
