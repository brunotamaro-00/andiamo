import { describe, expect, it } from "vitest";
import { countryCodeFromFlag } from "./country-currency";

describe("countryCodeFromFlag", () => {
  it("maps regional-indicator pairs to a lowercase ISO code", () => {
    expect(countryCodeFromFlag("🇨🇿")).toBe("cz");
    expect(countryCodeFromFlag("🇦🇷")).toBe("ar");
    expect(countryCodeFromFlag("🇬🇧")).toBe("gb");
  });

  // The UK legs (York, Edimburgo, Fort William…) rely on these: they are tag
  // sequences, not regional indicators, and flag-icons wants them hyphenated.
  it("maps subdivision tag sequences to a hyphenated code", () => {
    expect(countryCodeFromFlag("🏴󠁧󠁢󠁥󠁮󠁧󠁿")).toBe("gb-eng");
    expect(countryCodeFromFlag("🏴󠁧󠁢󠁳󠁣󠁴󠁿")).toBe("gb-sct");
    expect(countryCodeFromFlag("🏴󠁧󠁢󠁷󠁬󠁳󠁿")).toBe("gb-wls");
  });

  it("returns null for absent or non-flag input", () => {
    expect(countryCodeFromFlag(null)).toBeNull();
    expect(countryCodeFromFlag(undefined)).toBeNull();
    expect(countryCodeFromFlag("")).toBeNull();
    expect(countryCodeFromFlag("ar")).toBeNull();
    expect(countryCodeFromFlag("🇨")).toBeNull();
    expect(countryCodeFromFlag("🇨🇿🇦🇷")).toBeNull();
  });
});
