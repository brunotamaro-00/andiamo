/**
 * itinerary-slots.ts — the "where does this city go" model, as pure functions.
 *
 * The itinerary is a strictly contiguous sequence (see `itinerary-core.ts`), so
 * a position isn't really "después de X" — it's one of the N+1 **gaps** in the
 * spine. Slot `i` means "insert before the i-th stop"; slot 0 is the start of
 * the trip and slot `spine.length` is the end.
 *
 * The server API still speaks `afterOrder` (`createStop`'s `insertAfterOrder`
 * and `updateStop`'s optional third argument), so this module owns the
 * translation between the two — and the projection of what the itinerary would
 * look like once the move lands.
 */
import { computeItinerary } from "./itinerary-core";

/** A stop as it appears in the itinerary spine (the picker's context rows). */
export interface SpineStop {
  id: string;
  order: number;
  name: string;
  countryFlag: string;
  nights: number;
  isCandidate: boolean;
}

interface SpineCandidate extends SpineStop {
  isLocal: boolean;
  isFlexMargin: boolean;
}

/**
 * The stops that make up the itinerary sequence, in order.
 *
 * Deliberately NOT filtered by person: `recalculateItinerary` walks every
 * `isLocal: false` stop regardless of owner, so hiding Bruno's Portugal leg from
 * Katia's picker would make every date after it wrong. Pseudo-cities (isLocal)
 * are excluded for the mirror reason — they run in parallel and never take a
 * slot in the sequence.
 */
export function itinerarySpine(
  stops: SpineCandidate[],
  excludeId?: string,
): SpineStop[] {
  return stops
    .filter((s) => !s.isLocal && !s.isFlexMargin && s.id !== excludeId)
    .sort((a, b) => a.order - b.order)
    .map(({ id, order, name, countryFlag, nights, isCandidate }) => ({
      id,
      order,
      name,
      countryFlag,
      nights,
      isCandidate,
    }));
}

/** The city being placed — an existing stop being moved, or one being created. */
export interface MovingStop {
  name: string;
  countryFlag: string;
  nights: number;
  isCandidate: boolean;
  /** `false` for pseudo-cities (isLocal): they run in parallel to the sequence
   *  and `recalculateItinerary` skips them, so they must not move the cursor. */
  countsTowardCursor?: boolean;
}

/** Synthetic id for the moving stop inside the projection. Never hits the DB. */
export const MOVING_ID = "__moving__";

/**
 * The `afterOrder` value the server expects for a slot: the order of the stop
 * just before the gap, or 0 for "al principio".
 */
export function afterOrderForSlot(spine: SpineStop[], slot: number): number {
  const clamped = clampSlot(spine, slot);
  return clamped === 0 ? 0 : spine[clamped - 1].order;
}

/** Slot a stop currently occupies, from its own `order`. */
export function currentSlotIndex(spine: SpineStop[], movingOrder: number): number {
  return spine.filter((s) => s.order < movingOrder).length;
}

export function clampSlot(spine: SpineStop[], slot: number): number {
  if (!Number.isFinite(slot)) return spine.length;
  return Math.max(0, Math.min(spine.length, Math.trunc(slot)));
}

export interface PreviewRow {
  /** Stop id, or `MOVING_ID` for the city being placed. */
  id: string;
  name: string;
  countryFlag: string;
  nights: number;
  isCandidate: boolean;
  isMoving: boolean;
  arrival: Date | null;
  departure: Date | null;
}

/**
 * The itinerary as it *would* read with the moving city sitting in `slot` —
 * every row's dates recomputed by the same walk the server runs on save. The
 * spine must already exclude the moving stop.
 */
export function previewItinerary(
  spine: SpineStop[],
  moving: MovingStop,
  slot: number,
  tripStartStr: string | null,
): PreviewRow[] {
  const at = clampSlot(spine, slot);
  const movingRow: PreviewRow = {
    id: MOVING_ID,
    name: moving.name,
    countryFlag: moving.countryFlag,
    nights: moving.nights,
    isCandidate: moving.isCandidate,
    isMoving: true,
    arrival: null,
    departure: null,
  };
  const rows: PreviewRow[] = [
    ...spine.slice(0, at).map(toRow),
    movingRow,
    ...spine.slice(at).map(toRow),
  ];

  // A stop that doesn't consume the cursor behaves exactly like a candidate in
  // the walk, so reuse that branch instead of teaching the core a second rule.
  const dates = computeItinerary(
    rows.map((r, i) => ({
      id: r.id,
      order: i,
      nights: r.nights,
      isCandidate:
        r.isMoving && moving.countsTowardCursor === false ? true : r.isCandidate,
    })),
    tripStartStr,
  );

  return rows.map((r) => {
    const d = dates.get(r.id);
    return { ...r, arrival: d?.arrival ?? null, departure: d?.departure ?? null };
  });
}

function toRow(s: SpineStop): PreviewRow {
  return {
    id: s.id,
    name: s.name,
    countryFlag: s.countryFlag,
    nights: s.nights,
    isCandidate: s.isCandidate,
    isMoving: false,
    arrival: null,
    departure: null,
  };
}

/**
 * Human label for a slot — "Al principio", "Entre X e Y", "Al final".
 * Used by the collapsed row that opens the picker.
 */
export function slotLabel(spine: SpineStop[], slot: number): string {
  const at = clampSlot(spine, slot);
  const before = at > 0 ? spine[at - 1] : null;
  const after = at < spine.length ? spine[at] : null;

  if (!before && !after) return "Primera parada del viaje";
  if (!before) return `Al principio, antes de ${after!.name}`;
  if (!after) return `Al final, después de ${before.name}`;
  return `Entre ${before.name} y ${after.name}`;
}
