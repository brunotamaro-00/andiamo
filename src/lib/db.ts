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

/** True when a mutation failed because the target/related record no longer exists
 *  (P2025: record not found, P2003: FK violation) — e.g. a stale client posting
 *  against a concurrently-deleted stop. */
export function isRecordMissing(e: unknown): boolean {
  const code = (e as { code?: string }).code;
  return code === "P2025" || code === "P2003";
}
