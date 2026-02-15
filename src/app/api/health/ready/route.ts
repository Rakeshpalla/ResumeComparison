import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Readiness probe: checks DB and S3 config.
 * Use for Kubernetes/Docker readiness; returns 503 if not ready.
 */
export async function GET() {
  const checks: { name: string; ok: boolean; error?: string }[] = [];

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.push({ name: "database", ok: true });
  } catch (e) {
    checks.push({
      name: "database",
      ok: false,
      error: e instanceof Error ? e.message : "Connection failed"
    });
  }

  const hasS3 = Boolean(process.env.S3_BUCKET);
  checks.push({ name: "s3_config", ok: hasS3, ...(hasS3 ? {} : { error: "S3_BUCKET not set" }) });

  const allOk = checks.every((c) => c.ok);
  return NextResponse.json(
    { ok: allOk, checks },
    { status: allOk ? 200 : 503 }
  );
}
