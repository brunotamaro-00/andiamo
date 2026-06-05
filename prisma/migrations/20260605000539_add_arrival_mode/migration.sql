-- CreateEnum
CREATE TYPE "TransportMode" AS ENUM ('flight', 'ground');

-- AlterTable
ALTER TABLE "Stop" ADD COLUMN     "arrivalMode" "TransportMode" NOT NULL DEFAULT 'ground';
