-- Anchored stops: fixed dates the itinerary walk jumps to instead of deriving.
ALTER TABLE "Stop" ADD COLUMN "isAnchored" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: replay the contiguous cursor walk that computeItinerary used to do
-- and anchor every stop whose stored arrivalDate disagrees with it. That makes
-- the *current* itinerary a fixed point of the new algorithm — the first
-- recalculation after this migration changes nothing that already had a date.
--
-- Against the real trip this anchors Londres (the start), Barcelona (the ten
-- unbooked days after Nápoles) and the Swiss candidates that run in parallel to
-- Interlaken rather than after it.
DO $$
DECLARE
  r RECORD;
  cursor_date DATE := NULL;
  arrival DATE;
BEGIN
  FOR r IN
    SELECT id, nights, "isCandidate", "arrivalDate"
    FROM "Stop"
    WHERE "isLocal" = false
    ORDER BY "order" ASC
  LOOP
    IF r."arrivalDate" IS NOT NULL AND (cursor_date IS NULL OR r."arrivalDate" <> cursor_date) THEN
      UPDATE "Stop" SET "isAnchored" = true WHERE id = r.id;
      arrival := r."arrivalDate";
    ELSE
      arrival := cursor_date;
    END IF;

    -- Mirrors computeItinerary exactly: candidates are alternatives to the
    -- mainline, not extra legs, so they never advance the cursor even when
    -- anchored (Grindelwald runs instead of Interlaken, not after it).
    IF NOT r."isCandidate" AND r.nights > 0 AND arrival IS NOT NULL THEN
      cursor_date := arrival + r.nights;
    ELSIF cursor_date IS NULL THEN
      cursor_date := arrival;
    END IF;
  END LOOP;
END $$;

-- The tripStartDate Setting is a cache of the first anchor, not an independent
-- value. It had drifted to 2026-05-31 against a 2026-08-05 departure, which is
-- what would have rewritten the whole trip on the next edit.
UPDATE "Setting" s
SET value = to_char(a."arrivalDate", 'YYYY-MM-DD'), "updatedAt" = now()
FROM (
  SELECT "arrivalDate" FROM "Stop"
  WHERE "isAnchored" AND "arrivalDate" IS NOT NULL AND "isLocal" = false
  ORDER BY "order" ASC LIMIT 1
) a
WHERE s.key = 'tripStartDate';
