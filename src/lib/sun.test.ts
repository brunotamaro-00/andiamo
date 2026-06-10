import { describe, expect, it } from "vitest";
import { tentativeSunTimes } from "./sun";

const MADRID = { lat: 40.4168, lng: -3.7038, tz: "Europe/Madrid" };

describe("tentativeSunTimes", () => {
  it("returns plausible mid-July times for Madrid", () => {
    const result = tentativeSunTimes(
      MADRID.lat,
      MADRID.lng,
      "2026-07-10",
      "2026-07-20",
      MADRID.tz,
    );
    expect(result).not.toBeNull();
    // Mid-July Madrid: sunrise ~06:5x, sunset ~21:4x
    expect(result!.sunrise).toMatch(/^06:5\d$/);
    expect(result!.sunset).toMatch(/^21:4\d$/);
  });

  it("uses arrival alone when departure is missing", () => {
    const result = tentativeSunTimes(MADRID.lat, MADRID.lng, "2026-12-21", null, MADRID.tz);
    expect(result).not.toBeNull();
    // Winter solstice: late sunrise, early sunset
    expect(result!.sunrise.slice(0, 2)).toBe("08");
    expect(result!.sunset.slice(0, 2)).toBe("17");
  });

  it("returns null without an arrival date", () => {
    expect(tentativeSunTimes(MADRID.lat, MADRID.lng, null, null, MADRID.tz)).toBeNull();
  });
});
