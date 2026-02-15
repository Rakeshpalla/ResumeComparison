import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const QUERY_TIMEOUT_MS = Number(process.env.DATABASE_CONNECTION_TIMEOUT) || 30_000;
const isTransientError = (e: unknown): boolean => {
  const msg = e instanceof Error ? e.message : String(e);
  return /connection|timeout|ECONNREFUSED|ETIMEDOUT|deadlock|serialization/i.test(msg);
};

const prismaClient = new PrismaClient({
  log: process.env.NODE_ENV === "production" ? ["error"] : ["error", "warn"]
});

prismaClient.$use(async (params, next) => {
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Query timeout")), QUERY_TIMEOUT_MS)
  );
  try {
    return await Promise.race([next(params), timeoutPromise]);
  } catch (e) {
    if (isTransientError(e)) {
      try {
        return await next(params);
      } catch {
        throw e;
      }
    }
    throw e;
  }
});

export const prisma = globalForPrisma.prisma ?? prismaClient;
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
