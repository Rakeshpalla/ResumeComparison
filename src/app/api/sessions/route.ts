import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "../../../lib/auth";
import { createSession } from "../../../services/sessionService";
import { checkRateLimit } from "../../../lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const rateLimitRes = checkRateLimit(request, "api");
  if (rateLimitRes) return rateLimitRes;
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const idempotencyKey = request.headers.get("Idempotency-Key");
  const session = await createSession({
    userId: user.id,
    tenantId: user.tenantId,
    idempotencyKey
  });
  return NextResponse.json({ sessionId: session.id, status: session.status });
}
