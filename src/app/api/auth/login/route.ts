import { NextResponse } from "next/server";
import { authSchema } from "../../../../lib/validation";
import { authenticateUser } from "../../../../services/userService";
import { attachSessionCookie, createSessionToken } from "../../../../lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = authSchema.parse(body);
    const user = await authenticateUser(payload.email, payload.password);
    const token = await createSessionToken(user.id);
    const response = NextResponse.json({ userId: user.id });
    attachSessionCookie(response, token, request);
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Login failed." },
      { status: 401 }
    );
  }
}
