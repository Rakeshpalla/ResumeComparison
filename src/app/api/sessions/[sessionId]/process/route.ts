import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/db";
import { processSessionExtraction } from "../../../../../services/extractionService";
import { checkRateLimit } from "../../../../../lib/rate-limit";

export const runtime = "nodejs";
// Allow up to 60s so extraction (parallelized) can finish; Vercel Pro supports 60s.
export const maxDuration = 60;

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

  if (session.status === "COMPLETED") {
    return NextResponse.json({ status: "COMPLETED" });
  }

  try {
    await processSessionExtraction(session.id);
    const updated = await prisma.comparisonSession.findUnique({
      where: { id: session.id },
      select: { status: true }
    });
    return NextResponse.json({ status: updated?.status ?? "COMPLETED" });
  } catch {
    await prisma.comparisonSession
      .update({
        where: { id: session.id },
        data: { status: "FAILED" }
      })
      .catch(() => undefined);
    return NextResponse.json({ status: "FAILED" }, { status: 500 });
  }
}
