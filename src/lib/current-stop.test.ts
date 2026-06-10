import { describe, expect, it, vi } from "vitest";

// The module also exports DB-backed wrappers — stub the Prisma client out.
vi.mock("./db", () => ({ db: {} }));

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
});
