import { describe, expect, it } from "vitest";
import { parseForm, CreateStopSchema, UpdateStopSchema } from "./_schemas";

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
});

const validUpdate = {
  name: "Brujas",
  nights: "2",
  arrivalDate: "2026-07-10",
  datesFixed: "true",
  isCandidate: "false",
  isTransit: "false",
  arrivalMode: "ground",
};

describe("UpdateStopSchema", () => {
  it("accepts a valid YYYY-MM-DD arrival date", () => {
    const result = parseForm(fd(validUpdate), UpdateStopSchema);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.arrivalDate?.toISOString()).toBe("2026-07-10T00:00:00.000Z");
  });

  it("empty arrival date becomes null", () => {
    const result = parseForm(fd({ ...validUpdate, arrivalDate: "" }), UpdateStopSchema);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.arrivalDate).toBeNull();
  });

  it("rejects a malformed arrival date — Invalid Date would crash Prisma", () => {
    expect(parseForm(fd({ ...validUpdate, arrivalDate: "garbage" }), UpdateStopSchema).ok).toBe(false);
    expect(parseForm(fd({ ...validUpdate, arrivalDate: "10/07/2026" }), UpdateStopSchema).ok).toBe(false);
  });

  it("rejects negative nights", () => {
    expect(parseForm(fd({ ...validUpdate, nights: "-1" }), UpdateStopSchema).ok).toBe(false);
  });
});
