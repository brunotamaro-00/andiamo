import { describe, expect, it } from "vitest";
import { precacheOutcome } from "./offline-download";

describe("precacheOutcome", () => {
  it("treats a clean finish as success", () => {
    expect(precacheOutcome({ failed: 0, gone: 0, total: 201, bytes: 1_000 })).toEqual({
      status: "ok",
      gone: 0,
      bytes: 1_000,
    });
  });

  it("saves when only orphaned documents are missing (recoverable from the phone's point of view)", () => {
    // One R2 404 must not reject the whole download — the other 200 files are
    // in cache and airplane mode still works. The toast can mention `gone`.
    expect(precacheOutcome({ failed: 0, gone: 1, total: 201, bytes: 48_000_000 })).toEqual({
      status: "ok",
      gone: 1,
      bytes: 48_000_000,
    });
  });

  it("fails fatally when quota/network left files uncached", () => {
    expect(precacheOutcome({ failed: 3, gone: 0, total: 201, bytes: 10 })).toEqual({
      status: "fatal",
      failed: 3,
      total: 201,
    });
  });

  it("fails fatally even if some docs were also gone — space/network is what a retry can fix", () => {
    expect(precacheOutcome({ failed: 2, gone: 1, total: 201, bytes: 10 })).toEqual({
      status: "fatal",
      failed: 2,
      total: 201,
    });
  });

  it("treats missing counters as zero (older SW reply shape)", () => {
    expect(precacheOutcome({ bytes: 100 })).toEqual({
      status: "ok",
      gone: 0,
      bytes: 100,
    });
  });
});
