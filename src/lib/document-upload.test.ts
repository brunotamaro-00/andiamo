import { describe, expect, it, vi } from "vitest";

// The module pulls in the Prisma client and the R2 SDK for persistUploadedDocument;
// only the pure helpers are under test here.
vi.mock("./db", () => ({ db: {} }));
vi.mock("./r2", () => ({ uploadToR2: async () => {}, deleteFromR2: async () => {} }));

import {
  MAX_BYTES,
  labelFromFileName,
  parseDocDate,
  parseDocKind,
  validateUploadFile,
} from "./document-upload";

function file(name: string, type: string, size: number): File {
  const f = new File(["x"], name, { type });
  Object.defineProperty(f, "size", { value: size });
  return f;
}

describe("validateUploadFile", () => {
  it("accepts the allowed types", () => {
    expect(validateUploadFile(file("v.pdf", "application/pdf", 1000))).toBeNull();
    expect(validateUploadFile(file("v.jpg", "image/jpeg", 1000))).toBeNull();
    expect(validateUploadFile(file("v.webp", "image/webp", 1000))).toBeNull();
  });

  it("rejects a missing file", () => {
    expect(validateUploadFile(null)?.status).toBe(400);
  });

  it("rejects a disallowed mime type or extension", () => {
    expect(validateUploadFile(file("v.exe", "application/x-msdownload", 10))?.status).toBe(415);
    // Extension and mime must agree — a renamed executable must not pass.
    expect(validateUploadFile(file("v.exe", "application/pdf", 10))?.status).toBe(415);
  });

  it("rejects a file over the size cap", () => {
    expect(validateUploadFile(file("v.pdf", "application/pdf", MAX_BYTES + 1))?.status).toBe(413);
    expect(validateUploadFile(file("v.pdf", "application/pdf", MAX_BYTES))).toBeNull();
  });
});

describe("parseDocKind", () => {
  it("passes through every valid kind", () => {
    expect(parseDocKind("voucher")).toBe("voucher");
    expect(parseDocKind("checkin")).toBe("checkin");
  });

  // Regression: an out-of-enum kind used to reach db.document.create and blow up
  // *after* the file had been uploaded to R2.
  it("falls back to \"other\" on anything unknown", () => {
    expect(parseDocKind("bogus")).toBe("other");
    expect(parseDocKind(null)).toBe("other");
    expect(parseDocKind(undefined)).toBe("other");
    expect(parseDocKind(42)).toBe("other");
  });
});

describe("labelFromFileName", () => {
  it("strips the extension and separators", () => {
    expect(labelFromFileName("hostel_praga-2026.pdf")).toBe("hostel praga 2026");
  });

  it("falls back to the raw name when nothing is left", () => {
    expect(labelFromFileName(".pdf")).toBe(".pdf");
  });
});

describe("parseDocDate", () => {
  it("accepts YYYY-MM-DD and rejects anything else", () => {
    expect(parseDocDate("2026-07-24")?.toISOString()).toBe("2026-07-24T00:00:00.000Z");
    expect(parseDocDate("24-07-2026")).toBeNull();
    expect(parseDocDate("")).toBeNull();
  });
});
