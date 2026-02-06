import { NextRequest, NextResponse } from "next/server";
import { randomUUID, createHash } from "crypto";
import { getUserFromRequest } from "../../../../../../lib/auth";
import { signUploadSchema } from "../../../../../../lib/validation";
import { prisma } from "../../../../../../lib/db";
import { createSignedUploadUrl } from "../../../../../../services/storage";

export const runtime = "nodejs";

function safeExtensionFrom(params: { filename: string; contentType: string }) {
  const { filename, contentType } = params;
  const lower = filename.toLowerCase();
  if (contentType === "application/pdf" || lower.endsWith(".pdf")) return "pdf";
  if (
    contentType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
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
    where: { id: params.sessionId, userId: user.id }
  });
  if (!session) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  try {
    const body = await request.json();
    const payload = signUploadSchema.parse(body);
    const hash = createHash("sha256")
      .update(`${payload.filename}:${payload.sizeBytes}`)
      .digest("hex")
      .slice(0, 16);

    const ext = safeExtensionFrom({
      filename: payload.filename,
      contentType: payload.contentType
    });
    if (!ext) {
      return NextResponse.json(
        { error: "Unsupported file type. Upload PDF or DOCX only." },
        { status: 400 }
      );
    }

    const s3Key = `sessions/${session.id}/${hash}-${randomUUID()}.${ext}`;
    const uploadUrl = await createSignedUploadUrl(
      s3Key,
      payload.contentType
    );
    return NextResponse.json({ uploadUrl, s3Key });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid request." },
      { status: 400 }
    );
  }
}
