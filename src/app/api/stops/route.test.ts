import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    stop: {
      findMany: vi.fn().mockResolvedValue([
        {
          slug: "londres", order: 1, name: "Londres", country: "Reino Unido",
          countryFlag: "🇬🇧", arrivalDate: new Date("2026-08-05"),
          departureDate: new Date("2026-08-13"), nights: 8, datesFixed: true,
          currencyCode: "GBP", timezone: "Europe/London",
          isTransit: false, isCandidate: false, isFlexMargin: false,
        },
      ]),
    },
  },
}));

import { GET } from "./route";

function req(key?: string) {
  const headers = new Headers();
  if (key) headers.set("X-Api-Key", key);
  return new Request("http://x/api/stops", { headers });
}

beforeEach(() => {
  process.env.TRIP_SHARED_API_KEY = "k";
});

describe("GET /api/stops", () => {
  it("401 sin key", async () => {
    const res = await GET(req());
    expect(res.status).toBe(401);
  });

  it("200 con key y fechas YYYY-MM-DD", async () => {
    const res = await GET(req("k"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body[0].slug).toBe("londres");
    expect(body[0].arrivalDate).toBe("2026-08-05");
  });
});
