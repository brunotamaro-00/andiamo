-- Drop obsolete Stop flags: transit is implicit (0 nights), dates always computed.
ALTER TABLE "Stop" DROP COLUMN IF EXISTS "datesFixed";
ALTER TABLE "Stop" DROP COLUMN IF EXISTS "isTransit";
ALTER TABLE "Stop" DROP COLUMN IF EXISTS "arrivalMode";

DROP TYPE IF EXISTS "TransportMode";
