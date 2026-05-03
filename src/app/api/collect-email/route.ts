import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/db";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("email" in body) ||
    typeof (body as Record<string, unknown>).email !== "string"
  ) {
    return NextResponse.json({ error: "email is required." }, { status: 400 });
  }

  const email = ((body as Record<string, unknown>).email as string).trim().toLowerCase();
  const source =
    typeof (body as Record<string, unknown>).source === "string"
      ? ((body as Record<string, unknown>).source as string).slice(0, 50)
      : "landing_page";

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 422 });
  }

  try {
    await prisma.emailCapture.upsert({
      where: { email },
      update: {},
      create: { email, source },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error.";
    return NextResponse.json({ error: `Failed to save email: ${msg}` }, { status: 500 });
  }
}
