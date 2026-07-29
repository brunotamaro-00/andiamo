import { describe, expect, it } from "vitest";
import { addDaysStr, dateToStr, daysBetween, itineraryNights, strToDate, todayStr, tripDayNumber, TRIP_TIMEZONE } from "./trip";

describe("todayStr", () => {
  it("returns a YYYY-MM-DD string", () => {
    expect(todayStr()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("matches the calendar date in TRIP_TIMEZONE, not the server's", () => {
    const expected = new Intl.DateTimeFormat("en-CA", { timeZone: TRIP_TIMEZONE }).format(new Date());
    expect(todayStr()).toBe(expected);
  });
});

describe("strToDate / addDaysStr", () => {
  it("round-trips with dateToStr", () => {
    expect(dateToStr(strToDate("2026-06-10"))).toBe("2026-06-10");
  });

  it("adds days across month and year boundaries", () => {
    expect(addDaysStr("2026-06-29", 3)).toBe("2026-07-02");
    expect(addDaysStr("2026-12-30", 3)).toBe("2027-01-02");
    expect(addDaysStr("2026-06-10", 0)).toBe("2026-06-10");
  });
});

describe("daysBetween", () => {
  it("counts whole days between YYYY-MM-DD strings", () => {
    expect(daysBetween("2026-06-01", "2026-06-06")).toBe(5);
    expect(daysBetween("2026-06-06", "2026-06-01")).toBe(-5);
    expect(daysBetween("2026-06-01", "2026-06-01")).toBe(0);
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

describe("itineraryNights", () => {
  const stop = (arrival: string | null, departure: string | null) => ({
    arrivalDate: arrival ? strToDate(arrival) : null,
    departureDate: departure ? strToDate(departure) : null,
  });

  it("counts nights, not dates — departure is exclusive", () => {
    expect(itineraryNights([stop("2026-08-05", "2026-08-13")])).toBe(8);
  });

  it("adds consecutive stops without double-counting the handover day", () => {
    // Salida de una == llegada de la siguiente: esa fecha es una sola noche.
    expect(
      itineraryNights([stop("2026-08-05", "2026-08-13"), stop("2026-08-13", "2026-08-15")]),
    ).toBe(10);
  });

  it("dedups overlapping stops", () => {
    // Dos viajeros en paradas paralelas no duplican las noches del viaje.
    expect(
      itineraryNights([stop("2026-09-04", "2026-09-12"), stop("2026-09-04", "2026-09-09")]),
    ).toBe(8);
  });

  it("does not fill the gap between stops", () => {
    // La diferencia con el span de calendario: 10 días sin parada asignada
    // (el tramo tentativo entre Nápoles y Barcelona) no son noches del viaje.
    expect(
      itineraryNights([stop("2026-10-27", "2026-10-29"), stop("2026-11-08", "2026-11-13")]),
    ).toBe(7);
  });

  it("ignores stops without dates and zero-night transit stops", () => {
    expect(
      itineraryNights([
        stop("2026-08-05", "2026-08-13"),
        stop(null, null),
        stop("2026-08-20", null),
        stop("2026-08-20", "2026-08-20"),
      ]),
    ).toBe(8);
  });

  it("returns 0 for an empty itinerary", () => {
    expect(itineraryNights([])).toBe(0);
  });
});
