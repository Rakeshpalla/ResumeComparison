import { NextResponse } from "next/server";
import { clearSessionCookie } from "../../../../lib/auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const requireLogin = process.env.REQUIRE_LOGIN === "true";
  const redirectUrl = new URL(requireLogin ? "/login" : "/upload", request.url);
  const response = NextResponse.redirect(redirectUrl);
  clearSessionCookie(response, request);
  // Best-effort browser-side cleanup to prevent state leaks.
  response.headers.set("Clear-Site-Data", "\"cache\", \"cookies\", \"storage\"");
  return response;
}

export async function POST(request: Request) {
  const response = NextResponse.json({ success: true });
  clearSessionCookie(response, request);
  response.headers.set("Clear-Site-Data", "\"cache\", \"cookies\", \"storage\"");
  return response;
}
