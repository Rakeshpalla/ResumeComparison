import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const protectedPaths = ["/upload", "/compare"];

/** Allowed CORS origins from env (comma-separated). In dev, localhost is allowed when unset. */
function getAllowedOrigins(): string[] {
  const raw = process.env.ALLOWED_ORIGINS;
  if (raw && raw.trim()) {
    return raw.split(",").map((o) => o.trim()).filter(Boolean);
  }
  if (process.env.NODE_ENV !== "production") {
    return ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "http://127.0.0.1:3000", "http://127.0.0.1:3001", "http://127.0.0.1:3002"];
  }
  return [];
}

function corsResponse(request: NextRequest, response: NextResponse): NextResponse {
  const origin = request.headers.get("origin");
  const allowed = getAllowedOrigins();
  if (origin && (allowed.length === 0 || allowed.includes(origin))) {
    response.headers.set("Access-Control-Allow-Origin", origin);
  }
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  response.headers.set("Access-Control-Max-Age", "86400");
  return response;
}

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

  // CORS for API routes: handle preflight and add CORS headers to responses
  if (pathname.startsWith("/api/")) {
    if (request.method === "OPTIONS") {
      return corsResponse(request, new NextResponse(null, { status: 204 }));
    }
    const res = NextResponse.next();
    return corsResponse(request, res);
  }

  if (!protectedPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Guest-only by default: allow /upload and /compare without login unless REQUIRE_LOGIN is set
  const requireLogin = process.env.REQUIRE_LOGIN === "true";
  if (!requireLogin) {
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
  matcher: ["/api/:path*", "/upload/:path*", "/compare/:path*"]
};

