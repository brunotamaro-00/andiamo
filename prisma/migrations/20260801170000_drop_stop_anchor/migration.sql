-- Drop anchors: dates are now derived exclusively from the trip start, the stop
-- order and each stop's nights.
--
-- The DROP COLUMN alone is not enough. The stored dates were a fixed point of
-- the *anchored* walk, not of the contiguous one — Barcelona's 2026-11-08 held
-- the ten unbooked days after Nápoles and nothing in the new algorithm does.
-- Left as they are, the next stop edit would silently rewrite them. Replay the
-- new walk here instead, so the itinerary in the DB is already what the first
-- recalculation would produce.
DO $$
DECLARE
  r RECORD;
  cursor_date DATE;
  arrival DATE;
  departure DATE;
BEGIN
  SELECT value::date INTO cursor_date FROM "Setting" WHERE key = 'tripStartDate';

  -- Same bootstrap as recalculateItinerary: no Setting yet → earliest confirmed stop.
  IF cursor_date IS NULL THEN
    SELECT "arrivalDate" INTO cursor_date
    FROM "Stop"
    WHERE "isLocal" = false AND "isCandidate" = false AND "arrivalDate" IS NOT NULL
    ORDER BY "order" ASC LIMIT 1;
  END IF;

  IF cursor_date IS NULL THEN
    RETURN;
  END IF;

  -- Pseudo-cities (Pititas) run *during* another stop's window, not after it,
  -- so they stay out of the walk with their seeded dates untouched.
  FOR r IN
    SELECT id, nights, "isCandidate"
    FROM "Stop"
    WHERE "isLocal" = false
    ORDER BY "order" ASC
  LOOP
    arrival := cursor_date;
    departure := CASE WHEN r.nights > 0 THEN arrival + r.nights ELSE NULL END;

    UPDATE "Stop"
    SET "arrivalDate" = arrival, "departureDate" = departure
    WHERE id = r.id;

    -- Candidates are alternatives to the mainline, not extra legs of it.
    IF NOT r."isCandidate" AND departure IS NOT NULL THEN
      cursor_date := departure;
    END IF;
  END LOOP;
END $$;

ALTER TABLE "Stop" DROP COLUMN "isAnchored";
