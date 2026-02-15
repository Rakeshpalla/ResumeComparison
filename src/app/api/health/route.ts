import { NextResponse } from "next/server";
import { prisma } from "../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const hint =
      /Can't reach database server|connection refused|ECONNREFUSED|getaddrinfo/i.test(msg)
        ? " Start the database with: docker compose up -d (ensure Docker Desktop is running)."
        : "";
    return NextResponse.json(
      { ok: false, error: "Database unavailable." + hint },
      { status: 503 }
    );
  }
}
