import { describe, it, expect } from "vitest";
import {
  afterOrderForSlot,
  clampSlot,
  currentSlotIndex,
  previewItinerary,
  slotLabel,
  MOVING_ID,
  type SpineStop,
  type MovingStop,
} from "./itinerary-slots";
import { dateToStr } from "./trip";

/** Londres(1, 4n) · York(2, 2n) · Edimburgo(3, 3n) */
const spine: SpineStop[] = [
  { id: "lon", order: 1, name: "Londres", countryFlag: "🇬🇧", nights: 4, isCandidate: false },
  { id: "yor", order: 2, name: "York", countryFlag: "🇬🇧", nights: 2, isCandidate: false },
  { id: "edi", order: 3, name: "Edimburgo", countryFlag: "🇬🇧", nights: 3, isCandidate: false },
];

const palermo: MovingStop = {
  name: "Palermo",
  countryFlag: "🇮🇹",
  nights: 3,
  isCandidate: false,
};

const arrivals = (rows: ReturnType<typeof previewItinerary>) =>
  rows.map((r) => [r.name, r.arrival ? dateToStr(r.arrival) : null] as const);

describe("afterOrderForSlot", () => {
  it("maps slot 0 to 'al principio'", () => {
    expect(afterOrderForSlot(spine, 0)).toBe(0);
  });

  it("maps a middle slot to the order of the stop before the gap", () => {
    expect(afterOrderForSlot(spine, 2)).toBe(2); // entre York y Edimburgo
  });

  it("maps the last slot to the last stop's order", () => {
    expect(afterOrderForSlot(spine, 3)).toBe(3);
  });

  it("uses real orders, not indices — gaps in the sequence survive", () => {
    const sparse: SpineStop[] = [
      { ...spine[0], order: 5 },
      { ...spine[1], order: 9 },
    ];
    expect(afterOrderForSlot(sparse, 1)).toBe(5);
    expect(afterOrderForSlot(sparse, 2)).toBe(9);
  });

  it("clamps out-of-range slots instead of returning undefined", () => {
    expect(afterOrderForSlot(spine, 99)).toBe(3);
    expect(afterOrderForSlot(spine, -3)).toBe(0);
    expect(clampSlot(spine, Number.NaN)).toBe(3);
  });
});

describe("currentSlotIndex", () => {
  it("finds the gap a stop already occupies", () => {
    // Editing a stop with order 3, spine = the other two (orders 1 and 2)
    const others = spine.slice(0, 2);
    expect(currentSlotIndex(others, 3)).toBe(2);
  });

  it("returns 0 for the first stop of the trip", () => {
    expect(currentSlotIndex(spine.slice(1), 1)).toBe(0);
  });

  it("round-trips: the current slot maps back to a no-op afterOrder", () => {
    const others = [spine[0], spine[2]]; // moving York (order 2)
    const slot = currentSlotIndex(others, 2);
    // applyMove treats `afterOrder === currentOrder - 1` as "no move"
    expect(afterOrderForSlot(others, slot)).toBe(1);
  });
});

describe("previewItinerary", () => {
  const start = "2026-08-15";

  it("walks contiguously with the moving city inserted at the slot", () => {
    const rows = previewItinerary(spine, palermo, 2, start);
    expect(arrivals(rows)).toEqual([
      ["Londres", "2026-08-15"],
      ["York", "2026-08-19"],
      ["Palermo", "2026-08-21"],
      ["Edimburgo", "2026-08-24"],
    ]);
  });

  it("puts the moving city first at slot 0 and pushes everything back", () => {
    const rows = previewItinerary(spine, palermo, 0, start);
    expect(rows[0].id).toBe(MOVING_ID);
    expect(arrivals(rows)).toEqual([
      ["Palermo", "2026-08-15"],
      ["Londres", "2026-08-18"],
      ["York", "2026-08-22"],
      ["Edimburgo", "2026-08-24"],
    ]);
  });

  it("appends at the last slot", () => {
    const rows = previewItinerary(spine, palermo, 3, start);
    expect(rows.at(-1)?.id).toBe(MOVING_ID);
    expect(arrivals(rows).at(-1)).toEqual(["Palermo", "2026-08-24"]);
  });

  it("a tentative city gets dates but does not push the stops after it", () => {
    const rows = previewItinerary(spine, { ...palermo, isCandidate: true }, 2, start);
    expect(arrivals(rows)).toEqual([
      ["Londres", "2026-08-15"],
      ["York", "2026-08-19"],
      ["Palermo", "2026-08-21"],
      ["Edimburgo", "2026-08-21"],
    ]);
  });

  it("a stop that doesn't consume the cursor (isLocal) leaves the spine intact", () => {
    const rows = previewItinerary(
      spine,
      { ...palermo, countsTowardCursor: false },
      1,
      start,
    );
    expect(arrivals(rows)).toEqual([
      ["Londres", "2026-08-15"],
      ["Palermo", "2026-08-19"],
      ["York", "2026-08-19"],
      ["Edimburgo", "2026-08-21"],
    ]);
  });

  it("a 0-night transit city lands on the cursor day without advancing it", () => {
    const rows = previewItinerary(spine, { ...palermo, nights: 0 }, 2, start);
    const palermoRow = rows.find((r) => r.isMoving)!;
    expect(dateToStr(palermoRow.arrival!)).toBe("2026-08-21");
    expect(palermoRow.departure).toBeNull();
    expect(arrivals(rows).at(-1)).toEqual(["Edimburgo", "2026-08-21"]);
  });

  it("returns null dates when the trip has no start date", () => {
    const rows = previewItinerary(spine, palermo, 1, null);
    expect(rows.every((r) => r.arrival === null && r.departure === null)).toBe(true);
  });

  it("works on an empty itinerary", () => {
    const rows = previewItinerary([], palermo, 0, start);
    expect(arrivals(rows)).toEqual([["Palermo", "2026-08-15"]]);
  });
});

describe("slotLabel", () => {
  it("names the neighbours of the gap", () => {
    expect(slotLabel(spine, 0)).toBe("Al principio, antes de Londres");
    expect(slotLabel(spine, 2)).toBe("Entre York y Edimburgo");
    expect(slotLabel(spine, 3)).toBe("Al final, después de Edimburgo");
  });

  it("handles the first stop of an empty trip", () => {
    expect(slotLabel([], 0)).toBe("Primera parada del viaje");
  });
});
