import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "../../../../lib/db";
import { createSessionToken, attachSessionCookie, hashPassword } from "../../../../lib/auth";
import { checkRateLimit } from "../../../../lib/rate-limit";

export const runtime = "nodejs";

/**
 * POST /api/auth/guest
 * Creates a guest user and attaches a session cookie so the user can use upload/compare without registering.
 * Disabled only when REQUIRE_LOGIN is set to "true".
 */
export async function POST(request: NextRequest) {
  if (process.env.REQUIRE_LOGIN === "true") {
    return NextResponse.json({ error: "Login is required." }, { status: 403 });
  }
  const rateLimitRes = checkRateLimit(request, "auth");
  if (rateLimitRes) return rateLimitRes;

  try {
    const email = `guest-${randomUUID()}@guest.local`;
    const passwordHash = await hashPassword(randomUUID());
    const user = await prisma.user.create({
      data: { email, passwordHash },
    });
    const token = await createSessionToken(user.id);
    const response = NextResponse.json({ userId: user.id });
    attachSessionCookie(response, token, request);
    return response;
  } catch (e) {
    console.error("Guest auth error:", e);
    return NextResponse.json(
      { error: "Unable to start session. Please try again." },
      { status: 500 }
    );
  }
}
