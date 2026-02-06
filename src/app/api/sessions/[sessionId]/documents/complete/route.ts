import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "../../../../../../lib/auth";
import { completeUploadSchema } from "../../../../../../lib/validation";
import { prisma } from "../../../../../../lib/db";
import { upsertDocumentMetadata } from "../../../../../../services/documentService";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const session = await prisma.comparisonSession.findFirst({
    where: { id: params.sessionId, userId: user.id },
    include: { documents: true }
  });
  if (!session) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }
  if (session.documents.length >= 5) {
    return NextResponse.json(
      { error: "Session already has 5 documents." },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const payload = completeUploadSchema.parse(body);
    if (!payload.s3Key.startsWith(`sessions/${session.id}/`)) {
      return NextResponse.json(
        { error: "Invalid storage key." },
        { status: 400 }
      );
    }
    const document = await upsertDocumentMetadata({
      userId: user.id,
      sessionId: session.id,
      s3Key: payload.s3Key,
      filename: payload.filename,
      mimeType: payload.mimeType,
      sizeBytes: payload.sizeBytes
    });
    return NextResponse.json({ documentId: document.id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid request." },
      { status: 400 }
    );
  }
}
