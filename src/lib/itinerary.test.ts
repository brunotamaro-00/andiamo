import { describe, expect, it, vi } from "vitest";

// computeItinerary is pure, but the module also exports recalculateItinerary
// which pulls in the Prisma client, the temp-range fetcher and Next APIs — stub them out.
vi.mock("./db", () => ({ db: {} }));
vi.mock("./temp-range", () => ({ fetchTempRange: vi.fn() }));
vi.mock("next/server", () => ({ after: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { computeItinerary, assumedDateWindow } from "./itinerary";

interface StopOverrides {
  id: string;
  nights?: number;
  isCandidate?: boolean;
  anchor?: string;
}

let orderCounter = 0;

function stop({ id, nights = 0, isCandidate = false, anchor }: StopOverrides) {
  return {
    id,
    order: ++orderCounter,
    nights,
    isCandidate,
    isAnchored: anchor != null,
    arrivalDate: anchor ? new Date(`${anchor}T00:00:00.000Z`) : null,
  };
}

function iso(result: { arrival: Date | null; departure: Date | null }) {
  return {
    arrival: result.arrival ? result.arrival.toISOString().slice(0, 10) : null,
    departure: result.departure ? result.departure.toISOString().slice(0, 10) : null,
  };
}

describe("computeItinerary", () => {
  it("returns null dates for every stop when there is no trip start", () => {
    const stops = [stop({ id: "a", nights: 2 }), stop({ id: "b", nights: 3 })];
    const result = computeItinerary(stops, null);
    expect(iso(result.get("a")!)).toEqual({ arrival: null, departure: null });
    expect(iso(result.get("b")!)).toEqual({ arrival: null, departure: null });
  });

  it("chains arrival/departure through consecutive stops", () => {
    const stops = [stop({ id: "a", nights: 2 }), stop({ id: "b", nights: 3 })];
    const result = computeItinerary(stops, "2026-06-01");
    expect(iso(result.get("a")!)).toEqual({ arrival: "2026-06-01", departure: "2026-06-03" });
    expect(iso(result.get("b")!)).toEqual({ arrival: "2026-06-03", departure: "2026-06-06" });
  });

  it("chains across month and year boundaries", () => {
    const stops = [stop({ id: "a", nights: 3 }), stop({ id: "b", nights: 2 })];
    const result = computeItinerary(stops, "2026-12-30");
    expect(iso(result.get("a")!)).toEqual({ arrival: "2026-12-30", departure: "2027-01-02" });
    expect(iso(result.get("b")!)).toEqual({ arrival: "2027-01-02", departure: "2027-01-04" });
  });

  it("sorts stops by order before chaining", () => {
    const b = { id: "b", order: 2, nights: 3, isCandidate: false };
    const a = { id: "a", order: 1, nights: 2, isCandidate: false };
    const result = computeItinerary([b, a], "2026-06-01");
    expect(iso(result.get("a")!)).toEqual({ arrival: "2026-06-01", departure: "2026-06-03" });
    expect(iso(result.get("b")!)).toEqual({ arrival: "2026-06-03", departure: "2026-06-06" });
  });

  it("gives candidates tentative dates without advancing the cursor", () => {
    const stops = [
      stop({ id: "a", nights: 2 }),
      stop({ id: "maybe", nights: 3, isCandidate: true }),
      stop({ id: "b", nights: 1 }),
    ];
    const result = computeItinerary(stops, "2026-06-01");
    expect(iso(result.get("maybe")!)).toEqual({ arrival: "2026-06-03", departure: "2026-06-06" });
    // "b" starts where "a" ended — the candidate did not consume the slot
    expect(iso(result.get("b")!)).toEqual({ arrival: "2026-06-03", departure: "2026-06-04" });
  });

  it("places consecutive candidates at the same cursor position", () => {
    const stops = [
      stop({ id: "a", nights: 2 }),
      stop({ id: "c1", nights: 1, isCandidate: true }),
      stop({ id: "c2", nights: 4, isCandidate: true }),
      stop({ id: "b", nights: 1 }),
    ];
    const result = computeItinerary(stops, "2026-06-01");
    expect(iso(result.get("c1")!)).toEqual({ arrival: "2026-06-03", departure: "2026-06-04" });
    expect(iso(result.get("c2")!)).toEqual({ arrival: "2026-06-03", departure: "2026-06-07" });
    expect(iso(result.get("b")!)).toEqual({ arrival: "2026-06-03", departure: "2026-06-04" });
  });

  it("keeps the cursor in place for zero-night stops (departure null)", () => {
    const stops = [
      stop({ id: "transit", nights: 0 }),
      stop({ id: "b", nights: 2 }),
    ];
    const result = computeItinerary(stops, "2026-06-01");
    expect(iso(result.get("transit")!)).toEqual({ arrival: "2026-06-01", departure: null });
    expect(iso(result.get("b")!)).toEqual({ arrival: "2026-06-01", departure: "2026-06-03" });
  });

  it("handles an empty stop list", () => {
    expect(computeItinerary([], "2026-06-01").size).toBe(0);
    expect(computeItinerary([], null).size).toBe(0);
  });

  // Anchors. Before these existed the cursor was strictly contiguous, so the ten
  // unbooked days between Nápoles and Barcelona got eaten and Barcelona slid ten
  // days earlier than the flight that was already paid for.
  describe("anchored stops", () => {
    it("jumps the cursor to an anchored stop, preserving the gap before it", () => {
      const stops = [
        stop({ id: "napoles", nights: 2 }),
        stop({ id: "barcelona", nights: 5, anchor: "2026-11-08" }),
        stop({ id: "madrid", nights: 5 }),
      ];
      const result = computeItinerary(stops, "2026-10-27");
      expect(iso(result.get("napoles")!)).toEqual({
        arrival: "2026-10-27",
        departure: "2026-10-29",
      });
      expect(iso(result.get("barcelona")!)).toEqual({
        arrival: "2026-11-08",
        departure: "2026-11-13",
      });
      // Everything after the anchor chains from it, not from the gap.
      expect(iso(result.get("madrid")!)).toEqual({
        arrival: "2026-11-13",
        departure: "2026-11-18",
      });
    });

    it("shields an anchored stop from an edit upstream of it", () => {
      const build = (firstNights: number) => [
        stop({ id: "a", nights: firstNights }),
        stop({ id: "flight", nights: 3, anchor: "2026-07-01" }),
      ];
      orderCounter = 0;
      const before = computeItinerary(build(2), "2026-06-01");
      orderCounter = 0;
      const after = computeItinerary(build(9), "2026-06-01");
      expect(iso(before.get("flight")!)).toEqual(iso(after.get("flight")!));
    });

    it("does not let an anchored candidate advance the cursor", () => {
      // Grindelwald runs *instead of* Interlaken, not after it.
      const stops = [
        stop({ id: "interlaken", nights: 4 }),
        stop({ id: "grindelwald", nights: 4, isCandidate: true, anchor: "2026-09-19" }),
        stop({ id: "viena", nights: 5 }),
      ];
      const result = computeItinerary(stops, "2026-09-19");
      expect(iso(result.get("grindelwald")!)).toEqual({
        arrival: "2026-09-19",
        departure: "2026-09-23",
      });
      expect(iso(result.get("viena")!)).toEqual({
        arrival: "2026-09-23",
        departure: "2026-09-28",
      });
    });

    it("ignores an anchor with no date to anchor to", () => {
      const stops = [
        { id: "a", order: 1, nights: 2, isCandidate: false },
        { id: "b", order: 2, nights: 2, isCandidate: false, isAnchored: true, arrivalDate: null },
      ];
      const result = computeItinerary(stops, "2026-06-01");
      expect(iso(result.get("b")!)).toEqual({ arrival: "2026-06-03", departure: "2026-06-05" });
    });

    it("is a fixed point: recomputing an anchored itinerary changes nothing", () => {
      const stops = [
        stop({ id: "londres", nights: 8, anchor: "2026-08-05" }),
        stop({ id: "york", nights: 2 }),
        stop({ id: "napoles", nights: 2 }),
        stop({ id: "barcelona", nights: 5, anchor: "2026-11-08" }),
      ];
      const first = computeItinerary(stops, "2026-08-05");
      // Feed the computed dates back in as if they had been persisted.
      const persisted = stops.map((s) => ({
        ...s,
        arrivalDate: first.get(s.id)!.arrival,
      }));
      const second = computeItinerary(persisted, "2026-08-05");
      for (const s of stops) {
        expect(iso(second.get(s.id)!)).toEqual(iso(first.get(s.id)!));
      }
    });
  });
});

describe("assumedDateWindow", () => {
  const d = (s: string) => new Date(s);
  const dated = (order: number, arrival: string | null, departure: string | null) => ({
    order,
    arrivalDate: arrival ? d(arrival) : null,
    departureDate: departure ? d(departure) : null,
  });

  it("returns own dates when complete", () => {
    const s = dated(2, "2026-08-13", "2026-08-15");
    expect(assumedDateWindow(s, [s])).toEqual({
      arrival: d("2026-08-13"),
      departure: d("2026-08-15"),
    });
  });

  it("assumes the gap between dated neighbors for an undated stop", () => {
    const all = [
      dated(1, "2026-10-27", "2026-10-29"),
      dated(2, null, null),
      dated(3, null, null),
      dated(4, "2026-11-08", "2026-11-13"),
    ];
    const expected = { arrival: d("2026-10-29"), departure: d("2026-11-08") };
    expect(assumedDateWindow(all[1], all)).toEqual(expected);
    expect(assumedDateWindow(all[2], all)).toEqual(expected);
  });

  it("fills only the missing side when arrival is known", () => {
    const all = [
      dated(1, "2026-09-19", null),
      dated(2, "2026-09-23", "2026-09-28"),
    ];
    expect(assumedDateWindow(all[0], all)).toEqual({
      arrival: d("2026-09-19"),
      departure: d("2026-09-23"),
    });
  });

  it("returns null without a dated neighbor on the missing side", () => {
    const all = [dated(1, "2026-10-27", "2026-10-29"), dated(2, null, null)];
    expect(assumedDateWindow(all[1], all)).toBeNull();
  });
});
