import { prisma } from "../lib/db";

const DEFAULT_TTL_HOURS = 24;

function resolveTtlHours() {
  const ttl = process.env.DOCUMENT_TTL_HOURS;
  const parsed = ttl ? Number(ttl) : DEFAULT_TTL_HOURS;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TTL_HOURS;
}

export async function upsertDocumentMetadata(params: {
  userId: string;
  sessionId: string;
  s3Key: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
}) {
  const ttlHours = resolveTtlHours();
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

  return prisma.document.upsert({
    where: { s3Key: params.s3Key },
    create: {
      userId: params.userId,
      sessionId: params.sessionId,
      s3Key: params.s3Key,
      filename: params.filename,
      mimeType: params.mimeType,
      sizeBytes: params.sizeBytes,
      expiresAt
    },
    update: {
      filename: params.filename,
      mimeType: params.mimeType,
      sizeBytes: params.sizeBytes,
      expiresAt
    }
  });
}

export async function setDocumentStatus(
  documentId: string,
  status: "UPLOADED" | "EXTRACTED" | "FAILED"
) {
  return prisma.document.update({
    where: { id: documentId },
    data: { status }
  });
}
