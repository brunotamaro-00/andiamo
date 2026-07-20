-- Person-scoped stops: ownerPerson (null = shared, every existing stop) and
-- isLocal (pseudo-city that lives only in Andiamo's per-person view and is
-- excluded from the /api/stops sync to Spitwise).
ALTER TABLE "Stop" ADD COLUMN "ownerPerson" TEXT;
ALTER TABLE "Stop" ADD COLUMN "isLocal" BOOLEAN NOT NULL DEFAULT false;

-- Seed the "Pititas" stop and mark Lisboa/Porto as Bruno-owned so the itinerary
-- swaps per viewer during the Portugal leg (Sep 4-11 2026): Katia sees Pititas
-- in place of Lisboa/Porto. Guarded on the pititas row so re-runs are idempotent
-- and the order shift never happens twice.
DO $$
DECLARE porto_order INTEGER;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "Stop" WHERE slug = 'pititas') THEN
    SELECT "order" INTO porto_order FROM "Stop" WHERE slug = 'porto';
    -- No Portugal leg in this DB (fresh/other data): nothing to swap, skip.
    IF porto_order IS NULL THEN
      RETURN;
    END IF;

    -- Open a gap right after Porto. UNIQUE("order") is checked per-row, so a
    -- plain "+1" collides mid-update; shift the tail far out (+1000) first, then
    -- back to porto_order+2.. once the gap at porto_order+1 is free.
    UPDATE "Stop" SET "order" = "order" + 1000 WHERE "order" > porto_order;

    INSERT INTO "Stop" (
      "id", "order", "country", "countryFlag", "name", "slug", "category",
      "priceLevel", "arrivalDate", "departureDate", "nights", "latitude",
      "longitude", "timezone", "currencyCode", "ownerPerson", "isLocal",
      "createdAt", "updatedAt"
    ) VALUES (
      'pititas', porto_order + 1, '', '', 'Pititas', 'pititas', 'Pseudo',
      '$', DATE '2026-09-04', DATE '2026-09-12', 8, 0, 0, 'Europe/Paris',
      'EUR', 'katia', true, NOW(), NOW()
    );

    -- Bring the shifted tail back, now sitting right after the new Pititas row.
    UPDATE "Stop" SET "order" = "order" - 999 WHERE "order" > porto_order + 1000;

    UPDATE "Stop" SET "ownerPerson" = 'bruno' WHERE slug IN ('lisboa', 'porto');
  END IF;
END $$;
