import { prisma } from "../lib/db";

export async function createSession(params: {
  userId: string;
  tenantId?: string | null;
  idempotencyKey?: string | null;
}) {
  if (params.idempotencyKey) {
    const existing = await prisma.comparisonSession.findUnique({
      where: {
        userId_idempotencyKey: {
          userId: params.userId,
          idempotencyKey: params.idempotencyKey
        }
      }
    });
    if (existing) {
      return existing;
    }
  }

  return prisma.comparisonSession.create({
    data: {
      userId: params.userId,
      tenantId: params.tenantId || undefined,
      idempotencyKey: params.idempotencyKey || undefined,
      status: "PENDING"
    }
  });
}

export async function updateSessionStatus(
  sessionId: string,
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED"
) {
  return prisma.comparisonSession.update({
    where: { id: sessionId },
    data: { status }
  });
}

export async function getSession(sessionId: string, userId: string) {
  return prisma.comparisonSession.findFirst({
    where: { id: sessionId, userId },
    include: {
      documents: true,
      normalized: true
    }
  });
}
