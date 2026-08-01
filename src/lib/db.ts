import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL!;
  const adapter = new PrismaPg(connectionString);
  return new PrismaClient({ adapter });
}

const globalForPrisma = global as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

/** Prisma error code, or null for anything that isn't a Prisma error.
 *  Reading `.code` off a bare `e` throws its own TypeError when the rejection
 *  value is null/undefined — inside a catch block, which is the worst place. */
function errorCode(e: unknown): string | null {
  if (typeof e !== "object" || e === null) return null;
  const code = (e as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}

/** True when a mutation failed because the target/related record no longer exists
 *  (P2025: record not found, P2003: FK violation) — e.g. a stale client posting
 *  against a concurrently-deleted stop. */
export function isRecordMissing(e: unknown): boolean {
  const code = errorCode(e);
  return code === "P2025" || code === "P2003";
}

/** True when a mutation lost a race on a unique constraint (P2002) — two tabs
 *  or a double tap creating the same slug / claiming the same `Stop.order`. */
export function isUniqueViolation(e: unknown): boolean {
  return errorCode(e) === "P2002";
}
