import { describe, it, expect } from "vitest";
import { isPerson, personLabel, stopVisibleTo, PEOPLE } from "./person";

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

describe("stopVisibleTo", () => {
  const shared = { ownerPerson: null };
  const brunos = { ownerPerson: "bruno" };
  const katias = { ownerPerson: "katia" }; // e.g. Pititas

  it("shows shared stops to everyone", () => {
    for (const viewer of ["bruno", "katia", null] as const) {
      expect(stopVisibleTo(shared, viewer)).toBe(true);
    }
  });

  it("shows a person-scoped stop only to its owner", () => {
    expect(stopVisibleTo(brunos, "bruno")).toBe(true);
    expect(stopVisibleTo(brunos, "katia")).toBe(false);
    expect(stopVisibleTo(katias, "katia")).toBe(true);
    expect(stopVisibleTo(katias, "bruno")).toBe(false);
  });

  it("shows every stop to the Ambos household view", () => {
    expect(stopVisibleTo(brunos, null)).toBe(true);
    expect(stopVisibleTo(katias, null)).toBe(true);
  });
});
