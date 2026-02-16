import { prisma } from "../lib/db";
import { fetchObjectBuffer } from "./storage";
import { PdfParseExtractor } from "../extraction/pdfParseExtractor";
import { DocxMammothExtractor } from "../extraction/docxMammothExtractor";
import { displayNameForKey, normalizeAttributeName } from "./normalizationService";

const pdfExtractor = new PdfParseExtractor();
const docxExtractor = new DocxMammothExtractor();

function extractorForMimeType(mimeType: string) {
  if (mimeType === "application/pdf") return pdfExtractor;
  if (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return docxExtractor;
  }
  return null;
}

/** Process a single document: fetch, extract, persist. Runs in parallel with other docs. */
async function processOneDocument(
  sessionId: string,
  document: { id: string; s3Key: string; mimeType: string }
): Promise<{ success: boolean }> {
  try {
    const extractor = extractorForMimeType(document.mimeType);
    if (!extractor) {
      throw new Error(`Unsupported mimeType: ${document.mimeType}`);
    }
    const buffer = await fetchObjectBuffer(document.s3Key);
    const fields = await extractor.extract(buffer);

    const normalized = fields
      .filter((field) => !field.name.startsWith("__"))
      .map((field) => {
        const key = normalizeAttributeName(field.name);
        return {
          sessionId,
          documentId: document.id,
          key,
          displayName: displayNameForKey(key),
          value: field.value
        };
      });

    await prisma.$transaction([
      prisma.extractedField.deleteMany({
        where: { documentId: document.id }
      }),
      prisma.normalizedAttribute.deleteMany({
        where: { documentId: document.id }
      }),
      prisma.extractedField.createMany({
        data: fields.map((field) => ({
          documentId: document.id,
          name: field.name,
          value: field.value,
          source: field.source
        }))
      })
    ]);

    if (normalized.length > 0) {
      await prisma.normalizedAttribute.createMany({ data: normalized });
    }

    await prisma.document.update({
      where: { id: document.id },
      data: { status: "EXTRACTED" }
    });
    return { success: true };
  } catch {
    await prisma.document.update({
      where: { id: document.id },
      data: { status: "FAILED" }
    }).catch(() => undefined);
    return { success: false };
  }
}

export async function processSessionExtraction(sessionId: string) {
  const session = await prisma.comparisonSession.findUnique({
    where: { id: sessionId },
    include: { documents: true }
  });
  if (!session) {
    throw new Error("Session not found.");
  }

  await prisma.comparisonSession.update({
    where: { id: sessionId },
    data: { status: "PROCESSING" }
  });

  // Process all documents in parallel to cut total time (e.g. 4 docs: ~max(per-doc) instead of sum)
  const results = await Promise.all(
    session.documents.map((doc) => processOneDocument(sessionId, doc))
  );
  const hasFailure = results.some((r) => !r.success);

  await prisma.comparisonSession.update({
    where: { id: sessionId },
    data: { status: hasFailure ? "FAILED" : "COMPLETED" }
  });
}

export function enqueueSessionExtraction(sessionId: string) {
  setTimeout(() => {
    processSessionExtraction(sessionId).catch(() => {
      prisma.comparisonSession
        .update({
          where: { id: sessionId },
          data: { status: "FAILED" }
        })
        .catch(() => undefined);
    });
  }, 0);
}
