import { describe, expect, it } from "vitest";
import { dateToStr, todayStr, tripDayNumber } from "./trip";

describe("todayStr", () => {
  it("returns a YYYY-MM-DD string", () => {
    expect(todayStr()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("dateToStr", () => {
  it("converts a UTC-midnight Date to YYYY-MM-DD", () => {
    expect(dateToStr(new Date("2026-06-10T00:00:00.000Z"))).toBe("2026-06-10");
  });
});

describe("tripDayNumber", () => {
  it("returns 1 when arrival equals trip start", () => {
    expect(tripDayNumber("2026-06-01", "2026-06-01")).toBe(1);
  });

  it("counts days from the trip start", () => {
    expect(tripDayNumber("2026-06-06", "2026-06-01")).toBe(6);
  });

  it("accepts Date inputs from @db.Date fields", () => {
    expect(
      tripDayNumber(new Date("2026-06-03T00:00:00.000Z"), new Date("2026-06-01T00:00:00.000Z")),
    ).toBe(3);
  });

  it("crosses month boundaries", () => {
    expect(tripDayNumber("2026-07-02", "2026-06-30")).toBe(3);
  });

  it("returns null when either date is missing", () => {
    expect(tripDayNumber(null, "2026-06-01")).toBeNull();
    expect(tripDayNumber("2026-06-01", undefined)).toBeNull();
    expect(tripDayNumber(null, null)).toBeNull();
  });
});
