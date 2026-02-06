import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const protectedPaths = ["/upload", "/compare"];

async function verifyToken(token: string | undefined) {
  if (!token) {
    return false;
  }
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return false;
  }
  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!protectedPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  const token = request.cookies.get("specsheet_session")?.value;
  const valid = await verifyToken(token);
  if (!valid) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/upload/:path*", "/compare/:path*"]
};

