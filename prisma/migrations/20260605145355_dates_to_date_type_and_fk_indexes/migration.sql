-- AlterTable
ALTER TABLE "Stop" ALTER COLUMN "arrivalDate" SET DATA TYPE DATE,
ALTER COLUMN "departureDate" SET DATA TYPE DATE;

-- CreateIndex
CREATE INDEX "Document_stopId_idx" ON "Document"("stopId");

-- CreateIndex
CREATE INDEX "Note_stopId_idx" ON "Note"("stopId");

-- CreateIndex
CREATE INDEX "Poi_stopId_idx" ON "Poi"("stopId");
