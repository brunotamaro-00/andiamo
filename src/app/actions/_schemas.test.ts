import { describe, expect, it } from "vitest";
import {
  parseForm,
  CreateStopSchema,
  UpdateStopSchema,
  CreateDocumentLinkSchema,
  UpdateDocumentSchema,
  MAX_NIGHTS,
  MAX_STOP_ORDER,
} from "./_schemas";
import { addDaysStr } from "@/lib/trip";

function fd(entries: Record<string, string>): FormData {
  const form = new FormData();
  for (const [k, v] of Object.entries(entries)) form.set(k, v);
  return form;
}

const validCreate = {
  name: "Brujas",
  country: "Bélgica",
  countryCode: "be",
  latitude: "51.2093",
  longitude: "3.2247",
  timezone: "Europe/Brussels",
  nights: "3",
  insertAfterOrder: "5",
};

describe("CreateStopSchema", () => {
  it("accepts a valid stop", () => {
    const result = parseForm(fd(validCreate), CreateStopSchema);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.latitude).toBeCloseTo(51.2093);
      expect(result.data.nights).toBe(3);
      expect(result.data.countryCode).toBe("BE");
    }
  });

  it("defaults isCandidate to false when the checkbox is absent", () => {
    const result = parseForm(fd(validCreate), CreateStopSchema);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.isCandidate).toBe(false);
  });

  it("accepts a tentative stop at creation time", () => {
    const result = parseForm(
      fd({ ...validCreate, isCandidate: "true" }),
      CreateStopSchema,
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.isCandidate).toBe(true);
  });

  it("rejects negative nights — they would corrupt the itinerary cursor", () => {
    const result = parseForm(fd({ ...validCreate, nights: "-5" }), CreateStopSchema);
    expect(result.ok).toBe(false);
  });

  it("rejects integer input with trailing garbage", () => {
    const result = parseForm(fd({ ...validCreate, nights: "12abc" }), CreateStopSchema);
    expect(result.ok).toBe(false);
  });

  it("empty nights falls back to the default", () => {
    const result = parseForm(fd({ ...validCreate, nights: "" }), CreateStopSchema);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.nights).toBe(0);
  });

  it("rejects missing coordinates instead of defaulting to 0,0", () => {
    expect(parseForm(fd({ ...validCreate, latitude: "" }), CreateStopSchema).ok).toBe(false);
    expect(parseForm(fd({ ...validCreate, longitude: "" }), CreateStopSchema).ok).toBe(false);
  });

  it("rejects out-of-range coordinates", () => {
    expect(parseForm(fd({ ...validCreate, latitude: "95" }), CreateStopSchema).ok).toBe(false);
    expect(parseForm(fd({ ...validCreate, longitude: "200" }), CreateStopSchema).ok).toBe(false);
  });

  // A stop persisted with a non-IANA timezone made its detail page throw
  // RangeError out of Intl.DateTimeFormat — a permanent 500 with no field in
  // UpdateStopSchema to repair it from inside the app.
  it("rejects a timezone Intl can't construct", () => {
    expect(
      parseForm(fd({ ...validCreate, timezone: "Europe/Nowhere" }), CreateStopSchema).ok,
    ).toBe(false);
  });

  // "auto" was the old default and "undefined" is what a geocode result with no
  // timezone stringifies to. Both mean "we don't know", so they map to null —
  // the stop is still worth creating; it just falls back to the trip timezone.
  it("maps unknown-timezone sentinels to null instead of a fake zone", () => {
    for (const tz of ["", "auto", "undefined", "null"]) {
      const result = parseForm(fd({ ...validCreate, timezone: tz }), CreateStopSchema);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.data.timezone).toBeNull();
    }
  });

  it("bounds insertAfterOrder — an unreachable order strands the stop at the end", () => {
    expect(
      parseForm(fd({ ...validCreate, insertAfterOrder: String(MAX_STOP_ORDER + 1) }), CreateStopSchema)
        .ok,
    ).toBe(false);
    expect(
      parseForm(fd({ ...validCreate, insertAfterOrder: "999999" }), CreateStopSchema).ok,
    ).toBe(false);
  });
});

const validUpdate = {
  name: "Brujas",
  nights: "2",
  isCandidate: "false",
};

describe("UpdateStopSchema", () => {
  it("accepts a valid update", () => {
    const result = parseForm(fd(validUpdate), UpdateStopSchema);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.name).toBe("Brujas");
      expect(result.data.nights).toBe(2);
      expect(result.data.isCandidate).toBe(false);
    }
  });

  it("treats an absent isCandidate checkbox as false", () => {
    const result = parseForm(fd({ name: "Brujas", nights: "2" }), UpdateStopSchema);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.isCandidate).toBe(false);
  });

  it("rejects negative nights", () => {
    expect(parseForm(fd({ ...validUpdate, nights: "-1" }), UpdateStopSchema).ok).toBe(false);
  });
});

describe("nights upper bound", () => {
  // Regression: nights was unbounded, updateStop persisted before
  // recalculateItinerary() ran, and the poisoned row then made every later stop
  // mutation throw — because addDaysStr blows up on an out-of-range date.
  it("addDaysStr throws once the offset leaves the Date range", () => {
    expect(() => addDaysStr("2026-05-31", 100_000_000)).toThrow(RangeError);
  });

  it("accepts nights at the limit", () => {
    const result = parseForm(fd({ ...validUpdate, nights: String(MAX_NIGHTS) }), UpdateStopSchema);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.nights).toBe(MAX_NIGHTS);
  });

  it("rejects nights past the limit, on create and on update", () => {
    expect(parseForm(fd({ ...validUpdate, nights: "100000000" }), UpdateStopSchema).ok).toBe(false);
    expect(parseForm(fd({ ...validCreate, nights: "100000000" }), CreateStopSchema).ok).toBe(false);
    expect(parseForm(fd({ ...validUpdate, nights: String(MAX_NIGHTS + 1) }), UpdateStopSchema).ok).toBe(false);
  });
});

const validLink = {
  label: "Hostel Praga",
  note: "",
  kind: "voucher",
  docDate: "2026-07-24",
  url: "https://example.com/voucher.pdf",
};

describe("CreateDocumentLinkSchema", () => {
  it("accepts every kind the DB enum allows — voucher included", () => {
    const result = parseForm(fd(validLink), CreateDocumentLinkSchema);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.kind).toBe("voucher");
  });

  it("falls back to \"other\" on an unknown kind instead of failing", () => {
    const result = parseForm(fd({ ...validLink, kind: "bogus" }), CreateDocumentLinkSchema);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.kind).toBe("other");
  });

  it("requires a well-formed URL", () => {
    expect(parseForm(fd({ ...validLink, url: "" }), CreateDocumentLinkSchema).ok).toBe(false);
    expect(parseForm(fd({ ...validLink, url: "ftp://x.com/a" }), CreateDocumentLinkSchema).ok).toBe(false);
  });

  it("rejects a malformed docDate but allows an empty one", () => {
    expect(parseForm(fd({ ...validLink, docDate: "24-07-2026" }), CreateDocumentLinkSchema).ok).toBe(false);
    const empty = parseForm(fd({ ...validLink, docDate: "" }), CreateDocumentLinkSchema);
    expect(empty.ok).toBe(true);
    if (empty.ok) expect(empty.data.docDate).toBeNull();
  });
});

describe("UpdateDocumentSchema", () => {
  it("keeps an absent url undefined so uploads retain their file", () => {
    const result = parseForm(fd({ label: "Voucher", note: "", kind: "voucher", docDate: "" }), UpdateDocumentSchema);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.url).toBeUndefined();
  });

  // Known limitation, asserted so a future change is deliberate: an emptied URL
  // field collapses to undefined, which updateDocument skips — so a link
  // document's URL can be replaced but not cleared through the form.
  it("collapses an emptied url to undefined (cannot clear a link's URL)", () => {
    const result = parseForm(fd({ ...validLink, url: "" }), UpdateDocumentSchema);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.url).toBeUndefined();
  });
});
