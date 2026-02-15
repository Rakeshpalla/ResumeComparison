import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/db";
import { enqueueSessionExtraction } from "../../../../../services/extractionService";
import { checkRateLimit } from "../../../../../lib/rate-limit";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const rateLimitRes = checkRateLimit(request, "process");
  if (rateLimitRes) return rateLimitRes;
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
  if (session.documents.length < 2) {
    return NextResponse.json(
      { error: "Upload at least two documents." },
      { status: 400 }
    );
  }

  if (session.status === "PROCESSING") {
    return NextResponse.json({ status: session.status });
  }

  enqueueSessionExtraction(session.id);
  return NextResponse.json({ status: "PROCESSING" });
}
