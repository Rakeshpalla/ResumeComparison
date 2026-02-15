import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Liveness probe: app is running and can serve requests.
 * Use for Kubernetes/Docker liveness; no dependencies.
 */
export async function GET() {
  return NextResponse.json({ ok: true });
}
