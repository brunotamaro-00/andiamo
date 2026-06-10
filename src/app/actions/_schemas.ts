/**
 * _schemas.ts — Zod schemas for server action FormData validation.
 *
 * Usage: parse(formData, Schema) → typed result or throws ActionError.
 */
import { z } from "zod";

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Coerce a FormData value to a trimmed non-empty string, or throw. */
const requiredStr = z.string().min(1, "required").transform((v) => v.trim());

/** Optional string — null/empty → undefined */
const optionalStr = z.string().transform((v) => v.trim() || undefined).optional();

/** Optional URL string — validates format when present */
const optionalUrl = z
  .string()
  .transform((v) => v.trim() || undefined)
  .optional()
  .refine(
    (v) => v === undefined || /^https?:\/\//i.test(v),
    { message: "La URL debe comenzar con http:// o https://" },
  );

/** Coerce a numeric string. Empty → fallback; malformed input is rejected (never silently coerced). */
const numericStr = (fallback: number) =>
  z.string().transform((v, ctx) => {
    const t = v.trim();
    if (!t) return fallback;
    const n = parseFloat(t);
    if (!Number.isFinite(n)) {
      ctx.addIssue({ code: "custom", message: "Número inválido" });
      return z.NEVER;
    }
    return n;
  });

const intStr = (fallback: number) =>
  z.string().transform((v, ctx) => {
    const t = v.trim();
    if (!t) return fallback;
    const n = parseInt(t, 10);
    if (!Number.isFinite(n)) {
      ctx.addIssue({ code: "custom", message: "Número inválido" });
      return z.NEVER;
    }
    return n;
  });

/** Optional coordinate-style number — empty/invalid → null, but a valid "0" is kept. */
const optionalNumeric = z
  .string()
  .transform((v) => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : null;
  })
  .nullable()
  .optional();

/** Checkbox fields are absent from FormData when unchecked — treat undefined/null as false. */
const boolStr = z.preprocess((v) => (v == null ? "false" : String(v)), z.string().transform((v) => v === "true"));

/** Optional Date from YYYY-MM-DD string */
const optionalDate = z
  .string()
  .transform((v) => (v ? new Date(v) : null))
  .nullable()
  .optional();

// ── Schemas ──────────────────────────────────────────────────────────────────

export const CreateStopSchema = z.object({
  name: requiredStr,
  country: requiredStr,
  countryCode: z.string().transform((v) => v.trim().toUpperCase()),
  latitude: numericStr(0),
  longitude: numericStr(0),
  timezone: z.string().transform((v) => v.trim() || "auto"),
  nights: intStr(0),
  insertAfterOrder: intStr(0),
});

export const UpdateStopSchema = z.object({
  name: requiredStr,
  nights: intStr(0),
  arrivalDate: optionalDate,
  datesFixed: boolStr,
  isCandidate: boolStr,
  isTransit: boolStr,
  arrivalMode: z
    .string()
    .transform((v) => (v === "flight" ? "flight" : "ground"))
    .pipe(z.enum(["flight", "ground"])),
});

export const TripStartSchema = z.object({
  tripStartDate: z.string().min(1, "required"),
});

export const CreatePoiSchema = z.object({
  stopId: requiredStr,
  slug: requiredStr,
  name: requiredStr,
  type: z.enum(["hospedaje", "museo", "actividad", "comida", "mirador", "transporte", "otro"]).catch("otro"),
  latitude: optionalNumeric,
  longitude: optionalNumeric,
  address: optionalStr,
  url: optionalUrl,
  notes: optionalStr,
  reservationRequired: boolStr,
});

export const UpdatePoiSchema = z.object({
  slug: requiredStr,
  name: requiredStr,
  type: z.enum(["hospedaje", "museo", "actividad", "comida", "mirador", "transporte", "otro"]).catch("otro"),
  latitude: optionalNumeric,
  longitude: optionalNumeric,
  address: optionalStr,
  url: optionalUrl,
  notes: optionalStr,
  reservationRequired: boolStr,
});

export const CreateNoteSchema = z.object({
  slug: z.string().nullable().optional(),
  stopId: z.string().transform((v) => v || null).nullable().optional(),
  title: z.string().transform((v) => v.trim()),
  body: z.string().default(""),
  pinned: boolStr,
});

export const UpdateNoteSchema = z.object({
  title: z.string().transform((v) => v.trim()),
  body: z.string().default(""),
});

export const CreateDocumentLinkSchema = z.object({
  slug: z.string().nullable().optional(),
  stopId: z.string().transform((v) => v || null).nullable().optional(),
  label: requiredStr,
  kind: z.enum(["checkin", "voucher", "ticket", "carRental", "insurance", "flight", "other"]).catch("other"),
  url: z
    .string()
    .min(1, "URL requerida")
    .refine(
      (v) => /^https?:\/\//i.test(v),
      { message: "La URL debe comenzar con http:// o https://" },
    ),
});

// ── Parser ───────────────────────────────────────────────────────────────────

export type ActionResult<T = void> =
  | { data: T; error?: never }
  | { data?: never; error: string };

/** Parse a FormData against a Zod schema.
 *  Returns `{ ok: true, data }` or `{ ok: false, error }` — never throws. */
export function parseForm<T extends z.ZodTypeAny>(
  formData: FormData,
  schema: T,
): { ok: true; data: z.infer<T> } | { ok: false; error: string } {
  const raw = Object.fromEntries(formData.entries());
  const result = schema.safeParse(raw);
  if (!result.success) {
    const first = result.error.issues[0];
    return { ok: false, error: first ? `${first.path.join(".")}: ${first.message}` : "Datos inválidos" };
  }
  return { ok: true, data: result.data };
}
