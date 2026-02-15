/**
 * In-memory rate limiter for API routes.
 * Production: can be replaced with Redis-backed store (Phase 6).
 * Disabled when RATE_LIMIT_ENABLED=false (e.g. local dev).
 */

import { NextRequest, NextResponse } from "next/server";

export type RateLimitBucket = "auth" | "upload" | "process" | "api";

const BUCKET_CONFIG: Record<
  RateLimitBucket,
  { max: number; windowMs: number }
> = {
  auth: { max: 5, windowMs: 15 * 60 * 1000 },
  upload: { max: 10, windowMs: 60 * 60 * 1000 },
  process: { max: 20, windowMs: 60 * 60 * 1000 },
  api: { max: 100, windowMs: 15 * 60 * 1000 }
};

type WindowEntry = { count: number; resetAt: number };

const store = new Map<string, WindowEntry>();

function getClientId(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}

function isRateLimitEnabled(): boolean {
  const v = process.env.RATE_LIMIT_ENABLED;
  if (v === "false" || v === "0") return false;
  if (process.env.NODE_ENV === "development" && (v === undefined || v === "")) {
    return false;
  }
  return true;
}

function cleanup(): void {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) store.delete(key);
  }
}

const UPLOAD_BYTES_WINDOW_MS = 60 * 60 * 1000;
const UPLOAD_BYTES_MAX = 100 * 1024 * 1024; // 100MB per user per hour
type BytesEntry = { bytes: number; resetAt: number };
const uploadBytesStore = new Map<string, BytesEntry>();

function uploadBytesCleanup(): void {
  const now = Date.now();
  for (const [key, entry] of uploadBytesStore.entries()) {
    if (entry.resetAt < now) uploadBytesStore.delete(key);
  }
}

if (typeof setInterval !== "undefined") {
  setInterval(cleanup, 60 * 1000);
  setInterval(uploadBytesCleanup, 60 * 1000);
}

/**
 * Check and consume upload quota (per user, per hour). Returns 429 Response if over 100MB/hour, else null.
 * Call after auth, before writing to S3; then call recordUploadBytes after success.
 */
export function checkUploadBytesQuota(
  userId: string,
  additionalBytes: number
): NextResponse | null {
  if (!isRateLimitEnabled()) return null;
  const now = Date.now();
  const windowStart = Math.floor(now / UPLOAD_BYTES_WINDOW_MS) * UPLOAD_BYTES_WINDOW_MS;
  const key = `upload_bytes:${userId}:${windowStart}`;
  let entry = uploadBytesStore.get(key);
  if (!entry) {
    entry = { bytes: 0, resetAt: windowStart + UPLOAD_BYTES_WINDOW_MS };
    uploadBytesStore.set(key, entry);
  }
  if (entry.bytes + additionalBytes > UPLOAD_BYTES_MAX) {
    return NextResponse.json(
      {
        error: "Upload quota exceeded (100MB per hour). Try again later.",
        retryAfter: Math.ceil((entry.resetAt - now) / 1000)
      },
      { status: 429, headers: { "Retry-After": String(Math.ceil((entry.resetAt - now) / 1000)) } }
    );
  }
  return null;
}

/** Record successful upload size (call after S3 put). */
export function recordUploadBytes(userId: string, bytes: number): void {
  if (!isRateLimitEnabled()) return;
  const now = Date.now();
  const windowStart = Math.floor(now / UPLOAD_BYTES_WINDOW_MS) * UPLOAD_BYTES_WINDOW_MS;
  const key = `upload_bytes:${userId}:${windowStart}`;
  let entry = uploadBytesStore.get(key);
  if (!entry) {
    entry = { bytes: 0, resetAt: windowStart + UPLOAD_BYTES_WINDOW_MS };
    uploadBytesStore.set(key, entry);
  }
  entry.bytes += bytes;
}

/**
 * Check rate limit for this request. Returns 429 Response if over limit, else null.
 * Call at the start of API route handlers.
 */
export function checkRateLimit(
  request: NextRequest,
  bucket: RateLimitBucket
): NextResponse | null {
  if (!isRateLimitEnabled()) return null;

  const config = BUCKET_CONFIG[bucket];
  const id = getClientId(request);
  const key = `${bucket}:${id}`;
  const now = Date.now();

  let entry = store.get(key);
  if (!entry || entry.resetAt < now) {
    entry = { count: 1, resetAt: now + config.windowMs };
    store.set(key, entry);
    return null;
  }
  entry.count += 1;
  if (entry.count > config.max) {
    return NextResponse.json(
      {
        error: "Too many requests. Please try again later.",
        retryAfter: Math.ceil((entry.resetAt - now) / 1000)
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((entry.resetAt - now) / 1000)),
          "X-RateLimit-Limit": String(config.max),
          "X-RateLimit-Remaining": "0"
        }
      }
    );
  }
  return null;
}
