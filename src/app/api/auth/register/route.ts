import { NextRequest, NextResponse } from "next/server";
import { authSchema } from "../../../../lib/validation";
import { createSessionToken, attachSessionCookie } from "../../../../lib/auth";
import { registerUser } from "../../../../services/userService";
import { checkRateLimit } from "../../../../lib/rate-limit";

export const runtime = "nodejs";

const DB_UNREACHABLE_MSG =
  "Database is not available. Start it with: docker compose up -d (and ensure Docker Desktop is running).";

function isDbConnectionError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return /Can't reach database server|connection refused|ECONNREFUSED|getaddrinfo/i.test(msg);
}

export async function POST(request: NextRequest) {
  const rateLimitRes = checkRateLimit(request, "auth");
  if (rateLimitRes) return rateLimitRes;
  try {
    const body = await request.json();
    const payload = authSchema.parse(body);
    const user = await registerUser(payload.email, payload.password);
    const token = await createSessionToken(user.id);
    const response = NextResponse.json({ userId: user.id });
    attachSessionCookie(response, token, request);
    return response;
  } catch (error) {
    if (isDbConnectionError(error)) {
      return NextResponse.json({ error: DB_UNREACHABLE_MSG }, { status: 503 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Registration failed." },
      { status: 400 }
    );
  }
}
