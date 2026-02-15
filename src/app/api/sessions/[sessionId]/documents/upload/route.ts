import { NextRequest, NextResponse } from "next/server";
import { randomUUID, createHash } from "crypto";
import { getUserFromRequest } from "../../../../../../lib/auth";
import { prisma } from "../../../../../../lib/db";
import { putObjectBuffer, getMaxProxyUploadBytes } from "../../../../../../services/storage";
import { upsertDocumentMetadata } from "../../../../../../services/documentService";

export const runtime = "nodejs";

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
]);

function safeExtensionFrom(filename: string, contentType: string): string | null {
  const lower = filename.toLowerCase();
  if (contentType === "application/pdf" || lower.endsWith(".pdf")) return "pdf";
  if (
    contentType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    lower.endsWith(".docx")
  ) {
    return "docx";
  }
  return null;
}

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
    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Missing or invalid file. Use form field 'file'." },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Only PDF and DOCX files are supported." },
        { status: 400 }
      );
    }

    const ext = safeExtensionFrom(file.name, file.type);
    if (!ext) {
      return NextResponse.json(
        { error: "Unsupported file type. Upload PDF or DOCX only." },
        { status: 400 }
      );
    }

    const sizeBytes = file.size;
    if (sizeBytes > getMaxProxyUploadBytes()) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${Math.round(getMaxProxyUploadBytes() / 1024 / 1024)}MB.` },
        { status: 400 }
      );
    }

    const hash = createHash("sha256")
      .update(`${file.name}:${sizeBytes}`)
      .digest("hex")
      .slice(0, 16);
    const s3Key = `sessions/${session.id}/${hash}-${randomUUID()}.${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    await putObjectBuffer(s3Key, buffer, file.type);

    const document = await upsertDocumentMetadata({
      userId: user.id,
      sessionId: session.id,
      s3Key,
      filename: file.name,
      mimeType: file.type,
      sizeBytes
    });

    return NextResponse.json({ documentId: document.id });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Upload failed.";
    const isConnectionError =
      msg.includes("ECONNRESET") ||
      msg.includes("ECONNREFUSED") ||
      msg.includes("ETIMEDOUT") ||
      msg.includes("socket hang up");
    const status = isConnectionError ? 503 : 400;
    const userMessage = isConnectionError
      ? "Storage connection was reset. Ensure Docker (MinIO) is running (docker compose up -d) and try again."
      : msg;
    return NextResponse.json({ error: userMessage }, { status });
  }
}
