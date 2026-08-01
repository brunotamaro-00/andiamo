import { describe, expect, it, vi, beforeEach } from "vitest";

const noteCreate = vi.fn();
const stopFindUnique = vi.fn();
const notifyNotesChanged = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    note: { create: (...a: unknown[]) => noteCreate(...a) },
    stop: { findUnique: (...a: unknown[]) => stopFindUnique(...a) },
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/server", () => ({ after: (fn: () => void) => fn() }));
vi.mock("@/lib/spitwise", () => ({
  notifyNotesChanged: () => notifyNotesChanged(),
}));

import { POST } from "./route";

function req(body: unknown, key?: string) {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (key) headers.set("X-Api-Key", key);
  return new Request("http://x/api/integration/notes", {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.TRIP_SHARED_API_KEY = "k";
  stopFindUnique.mockResolvedValue({ id: "stop-1" });
  noteCreate.mockImplementation(async ({ data }: { data: { title: string } }) => ({
    id: "note-1",
    title: data.title,
  }));
});

describe("POST /api/integration/notes", () => {
  it("401 sin key", async () => {
    const res = await POST(req({ title: "x", body: "y" }));
    expect(res.status).toBe(401);
    expect(noteCreate).not.toHaveBeenCalled();
  });

  it("crea la nota en la parada y pingea a Spitwise", async () => {
    const res = await POST(
      req({ stopSlug: "roma", title: "Hostel", body: "Piden efectivo" }, "k"),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      id: "note-1",
      stopSlug: "roma",
      title: "Hostel",
    });
    expect(noteCreate).toHaveBeenCalledWith({
      data: { stopId: "stop-1", title: "Hostel", body: "Piden efectivo", pinned: false },
    });
    expect(notifyNotesChanged).toHaveBeenCalledOnce();
  });

  it("sin stopSlug la nota es general", async () => {
    await POST(req({ title: "Seguro", body: "Póliza 123" }, "k"));
    expect(stopFindUnique).not.toHaveBeenCalled();
    expect(noteCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ stopId: null }) }),
    );
  });

  it("422 con slug desconocido, sin escribir nada", async () => {
    stopFindUnique.mockResolvedValue(null);
    const res = await POST(req({ stopSlug: "atlantis", title: "x" }, "k"));
    expect(res.status).toBe(422);
    expect((await res.json()).error).toContain("atlantis");
    expect(noteCreate).not.toHaveBeenCalled();
  });

  it("sin título toma la primera línea del cuerpo", async () => {
    const res = await POST(req({ body: "Piden efectivo\ny toalla" }, "k"));
    expect((await res.json()).title).toBe("Piden efectivo");
  });

  it("400 si la nota no tiene contenido", async () => {
    const res = await POST(req({ title: "  ", body: "" }, "k"));
    expect(res.status).toBe(400);
    expect(noteCreate).not.toHaveBeenCalled();
  });

  it("400 con body que no es JSON", async () => {
    const res = await POST(req("no-json", "k"));
    expect(res.status).toBe(400);
  });
});
