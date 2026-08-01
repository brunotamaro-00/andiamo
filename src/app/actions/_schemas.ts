/**
 * _schemas.ts — Zod schemas for server action FormData validation.
 *
 * Usage: parse(formData, Schema) → typed result or throws ActionError.
 */
import { z } from "zod";
import { DocumentKind } from "@/generated/prisma/enums";

/** Derived from the Prisma enum so the schema can't drift from the DB. */
const documentKindEnum = z.enum(
  Object.values(DocumentKind) as [DocumentKind, ...DocumentKind[]],
);

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Coerce a FormData value to a trimmed non-empty string, or throw. */
const requiredStr = z.string().min(1, "required").transform((v) => v.trim());

/** Optional URL string — validates format when present */
const optionalUrl = z
  .string()
  .transform((v) => v.trim() || undefined)
  .optional()
  .refine(
    (v) => v === undefined || /^https?:\/\//i.test(v),
    { message: "La URL debe comenzar con http:// o https://" },
  );

/** Upper bound for `nights`. Without one, a pasted long number reaches addDaysStr(),
 *  where new Date(ms).toISOString() throws RangeError on an out-of-range date. Since
 *  updateStop persists before recalculateItinerary() runs, the poisoned value stays
 *  committed and every later stop mutation 500s. 365 is well past any real stay. */
export const MAX_NIGHTS = 365;

/** Non-negative integer — a negative value (e.g. nights) would corrupt the itinerary cursor. */
const intStr = (fallback: number, max?: number) =>
  z.string().transform((v, ctx) => {
    const t = v.trim();
    if (!t) return fallback;
    const n = parseInt(t, 10);
    if (!Number.isFinite(n) || !/^\d+$/.test(t)) {
      ctx.addIssue({ code: "custom", message: "Número inválido" });
      return z.NEVER;
    }
    if (max !== undefined && n > max) {
      ctx.addIssue({ code: "custom", message: `Máximo ${max}` });
      return z.NEVER;
    }
    return n;
  });

/** Required coordinate within [min, max] — a silent 0,0 default would feed weather/sun for the wrong place. */
const coordStr = (min: number, max: number) =>
  z.string().transform((v, ctx) => {
    const n = parseFloat(v.trim());
    if (!Number.isFinite(n) || n < min || n > max) {
      ctx.addIssue({ code: "custom", message: "Coordenada inválida" });
      return z.NEVER;
    }
    return n;
  });

/** Optional YYYY-MM-DD date — empty/absent → null; a bad format is rejected. */
const optionalDateStr = z
  .string()
  .transform((v) => v.trim())
  .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "Formato AAAA-MM-DD")
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional();

/** Checkbox fields are absent from FormData when unchecked — treat undefined/null as false. */
const boolStr = z.preprocess((v) => (v == null ? "false" : String(v)), z.string().transform((v) => v === "true"));

/** Upper bound for `insertAfterOrder`. Orders are contiguous from 1, so nothing
 *  legitimate lands past a few hundred; an out-of-range value would create a
 *  stop at an order no shift can ever reach, stranding it at the end forever. */
export const MAX_STOP_ORDER = 999;

/** A real IANA zone, or the empty marker. `Intl.DateTimeFormat` throws
 *  RangeError on anything else, and sun.ts feeds this straight into one from a
 *  Server Component — a stop saved with "auto" or "undefined" (which is what
 *  `formData.set("timezone", geo.timezone)` produces when the geocoder omits it)
 *  made its detail page 500 permanently, with no field in UpdateStopSchema to
 *  repair it from the app. */
const timezoneStr = z.string().transform((v, ctx) => {
  const t = v.trim();
  if (!t || t === "auto" || t === "undefined" || t === "null") return null;
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: t });
    return t;
  } catch {
    ctx.addIssue({ code: "custom", message: "Zona horaria inválida" });
    return z.NEVER;
  }
});

// ── Schemas ──────────────────────────────────────────────────────────────────

export const CreateStopSchema = z.object({
  name: requiredStr,
  country: requiredStr,
  countryCode: z.string().transform((v) => v.trim().toUpperCase()),
  latitude: coordStr(-90, 90),
  longitude: coordStr(-180, 180),
  timezone: timezoneStr,
  nights: intStr(0, MAX_NIGHTS),
  insertAfterOrder: intStr(0, MAX_STOP_ORDER),
});

export const UpdateStopSchema = z.object({
  name: requiredStr,
  nights: intStr(0, MAX_NIGHTS),
  isCandidate: boolStr,
  /** Fixed date: exclude this stop from the itinerary walk's cursor. */
  isAnchored: boolStr,
});

export const TripStartSchema = z.object({
  tripStartDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato AAAA-MM-DD")
    .refine((v) => !Number.isNaN(new Date(v).getTime()), "Fecha inválida"),
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
  note: z.string().transform((v) => v.trim()).default(""),
  kind: documentKindEnum.catch("other"),
  docDate: optionalDateStr,
  url: z
    .string()
    .min(1, "URL requerida")
    .refine(
      (v) => /^https?:\/\//i.test(v),
      { message: "La URL debe comenzar con http:// o https://" },
    ),
});

/** Edit an existing document. `url` is optional — only link documents carry it;
 *  uploads leave it absent and keep their stored file. */
export const UpdateDocumentSchema = z.object({
  label: requiredStr,
  note: z.string().transform((v) => v.trim()).default(""),
  kind: documentKindEnum.catch("other"),
  docDate: optionalDateStr,
  url: optionalUrl,
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
