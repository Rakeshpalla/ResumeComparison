import { NextResponse } from "next/server";
import { getAdminCookieSignature, ADMIN_COOKIE_NAME } from "@/lib/admin-auth";

/**
 * POST /api/admin/feedback-login
 * Body: { password: string }
 * If password matches ADMIN_PASSWORD, sets signed admin cookie and returns 200.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const password = String(body?.password ?? "").trim();
    const expected = process.env.ADMIN_PASSWORD;
    if (!expected) {
      return NextResponse.json({ error: "Admin not configured" }, { status: 500 });
    }
    if (password !== expected) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }
    const signature = getAdminCookieSignature();
    const res = NextResponse.json({ success: true });
    res.cookies.set(ADMIN_COOKIE_NAME, signature, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8, // 8 hours
    });
    return res;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
