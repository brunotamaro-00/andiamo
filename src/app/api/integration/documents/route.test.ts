import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const findMany = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    document: { findMany: (...a: unknown[]) => findMany(...a) },
    stop: { findUnique: vi.fn() },
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/document-upload", () => ({
  labelFromFileName: vi.fn(),
  parseDocDate: vi.fn(),
  persistUploadedDocument: vi.fn(),
  rejectOversizedBody: vi.fn(),
  validateUploadFile: vi.fn(),
}));

import { GET } from "./route";

function req(key?: string) {
  const headers = new Headers();
  if (key) headers.set("X-Api-Key", key);
  return new NextRequest("http://x/api/integration/documents", { headers });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.TRIP_SHARED_API_KEY = "k";
  findMany.mockResolvedValue([
    {
      id: "d1",
      stop: { slug: "roma" },
      label: "Voucher hostel",
      note: "Check-in 15hs",
      kind: "voucher",
      source: "upload",
      docDate: new Date("2026-09-03"),
      fileName: "voucher.pdf",
      mimeType: "application/pdf",
      createdAt: new Date("2026-08-01T10:00:00Z"),
      storagePath: "uploads/secreto.pdf",
      externalUrl: null,
    },
    {
      id: "d2",
      stop: null,
      label: "Seguro",
      note: null,
      kind: "insurance",
      source: "link",
      docDate: null,
      fileName: null,
      mimeType: null,
      createdAt: new Date("2026-07-01T10:00:00Z"),
      storagePath: null,
      externalUrl: "https://aseguradora/poliza",
    },
  ]);
});

describe("GET /api/integration/documents", () => {
  it("401 sin key", async () => {
    const res = await GET(req());
    expect(res.status).toBe(401);
    expect(findMany).not.toHaveBeenCalled();
  });

  it("devuelve metadata con docDate YYYY-MM-DD y stopSlug", async () => {
    const res = await GET(req("k"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body[0]).toMatchObject({
      id: "d1",
      stopSlug: "roma",
      label: "Voucher hostel",
      kind: "voucher",
      docDate: "2026-09-03",
    });
    expect(body[1]).toMatchObject({ stopSlug: null, docDate: null });
  });

  it("nunca filtra storagePath ni externalUrl", async () => {
    const body = await (await GET(req("k"))).json();
    for (const doc of body) {
      expect(doc).not.toHaveProperty("storagePath");
      expect(doc).not.toHaveProperty("externalUrl");
    }
  });
});
