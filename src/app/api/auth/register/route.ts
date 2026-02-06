import { NextResponse } from "next/server";
import { authSchema } from "../../../../lib/validation";
import { createSessionToken, attachSessionCookie } from "../../../../lib/auth";
import { registerUser } from "../../../../services/userService";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = authSchema.parse(body);
    const user = await registerUser(payload.email, payload.password);
    const token = await createSessionToken(user.id);
    const response = NextResponse.json({ userId: user.id });
    attachSessionCookie(response, token, request);
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Registration failed." },
      { status: 400 }
    );
  }
}
