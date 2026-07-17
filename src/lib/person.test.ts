import { describe, it, expect } from "vitest";
import { isPerson, personLabel, PEOPLE } from "./person";

describe("isPerson", () => {
  it("accepts the two trip people", () => {
    expect(PEOPLE.every(isPerson)).toBe(true);
  });

  it("rejects anything else", () => {
    // These strings reach Spitwise as ?user=, which 400s on an unknown user —
    // never let one through as if it were a person.
    for (const value of ["ambos", "Bruno", "", "admin", undefined, null]) {
      expect(isPerson(value as string | undefined | null)).toBe(false);
    }
  });
});

describe("personLabel", () => {
  it("capitalises a person", () => {
    expect(personLabel("bruno")).toBe("Bruno");
    expect(personLabel("katia")).toBe("Katia");
  });

  it("calls the household view Ambos", () => {
    expect(personLabel(null)).toBe("Ambos");
  });
});
