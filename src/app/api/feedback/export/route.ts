import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { toFeedbackRow } from "@/lib/feedback-db";
import type { FeedbackRow } from "@/lib/feedback-db";
import { isAdminAuthenticated } from "@/lib/admin-auth";

/**
 * GET /api/feedback/export
 * Protected by admin session cookie. Streams all feedback responses as CSV (from Neon/Prisma).
 */
export async function GET() {
  const ok = await isAdminAuthenticated();
  if (!ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const list = await prisma.feedbackResponse.findMany({
      orderBy: { createdAt: "desc" },
    });
    const rows: FeedbackRow[] = list.map(toFeedbackRow);
    const csv = toCSV(rows);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="feedback-export.csv"',
      },
    });
  } catch (e) {
    console.error("Feedback export error:", e);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}

function toCSV(rows: FeedbackRow[]): string {
  const headers = [
    "id",
    "created_at",
    "role",
    "resumes_per_role",
    "previous_method",
    "pain_point",
    "usefulness_rating",
    "valuable_features",
    "confidence_after",
    "missing_features",
    "missing_other",
    "open_feedback",
    "disappear_reaction",
    "would_recommend",
    "email",
  ];
  const escape = (v: unknown): string => {
    if (v == null) return "";
    const s = Array.isArray(v) ? v.join("; ") : String(v);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(
      headers.map((h) => escape((r as Record<string, unknown>)[h])).join(",")
    );
  }
  return lines.join("\r\n");
}
