import { describe, it, expect } from "vitest";
import { isTempId, tempId } from "./temp-id";

describe("temp-id", () => {
  it("marks generated ids as temporary", () => {
    expect(isTempId(tempId())).toBe(true);
  });

  it("does not mistake a real cuid/uuid for a temporary id", () => {
    // Server ids are what the delete/edit guards must let through.
    expect(isTempId("clx7k2p9a0000qw3f8h2m1n4v")).toBe(false);
    expect(isTempId(crypto.randomUUID())).toBe(false);
  });

  it("is unique within the same millisecond", () => {
    // The bug this replaces: `temp-${Date.now()}` collided for two adds resolved
    // in the same tick, duplicating React keys so the detail sheet opened — and
    // could delete — the wrong row.
    const ids = new Set(Array.from({ length: 1000 }, tempId));
    expect(ids.size).toBe(1000);
  });
});
