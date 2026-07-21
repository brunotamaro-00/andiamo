-- Remove the POI concept entirely. Andiamo keeps Notes + Documents; Google Maps
-- is the pin copilot. The "Poi" table cascades from Stop, so dropping it here is
-- clean. The "PoiType" enum is only referenced by that table, dropped after.
DROP TABLE IF EXISTS "Poi";

DROP TYPE IF EXISTS "PoiType";
