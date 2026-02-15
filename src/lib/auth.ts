import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "./db";

const COOKIE_NAME = "specsheet_session";
const TOKEN_TTL_SECONDS = 60 * 60 * 8;

export async function hashPassword(password: string) {
  // Optimized to 10 rounds for better performance while maintaining security
  // 10 rounds = ~100ms, 12 rounds = ~300ms
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not configured.");
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(userId: string) {
  const secret = getJwtSecret();
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_TTL_SECONDS}s`)
    .sign(secret);
}

export async function verifySessionToken(token: string) {
  const secret = getJwtSecret();
  const { payload } = await jwtVerify(token, secret);
  if (!payload.sub) {
    throw new Error("Invalid session token.");
  }
  return payload.sub;
}

export async function getUserFromRequest(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }
  try {
    const userId = await verifySessionToken(token);
    return prisma.user.findUnique({ where: { id: String(userId) } });
  } catch {
    return null;
  }
}

function isHttpsRequest(request: Request | NextRequest) {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (forwardedProto) {
    return forwardedProto.split(",")[0].trim().toLowerCase() === "https";
  }
  try {
    return new URL(request.url).protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Production-grade cookie options: HttpOnly (no JS access), Secure in production,
 * SameSite=Strict (CSRF mitigation), explicit path and maxAge.
 */
export function attachSessionCookie(
  response: NextResponse,
  token: string,
  request: Request | NextRequest
) {
  const isProd = process.env.NODE_ENV === "production";
  const secure = isProd ? true : isHttpsRequest(request);
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure,
    sameSite: "strict",
    path: "/",
    maxAge: TOKEN_TTL_SECONDS
  });
}

export function clearSessionCookie(
  response: NextResponse,
  request: Request | NextRequest
) {
  const base = {
    httpOnly: true,
    sameSite: "strict" as const,
    path: "/",
    maxAge: 0
  };
  const isProd = process.env.NODE_ENV === "production";
  const secure = isProd ? true : isHttpsRequest(request);
  response.cookies.set(COOKIE_NAME, "", { ...base, secure });
  if (!isProd && secure) {
    response.cookies.set(COOKIE_NAME, "", { ...base, secure: false });
  }
}
