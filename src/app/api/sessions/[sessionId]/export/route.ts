import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/db";
import { buildCsv } from "../../../../../lib/csv";
import { buildVerdict } from "../../../../../lib/verdict";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const session = await prisma.comparisonSession.findFirst({
    where: { id: params.sessionId, userId: user.id },
    include: {
      documents: true,
      normalized: true
    }
  });

  if (!session) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  const documents = session.documents;
  const rowsMap = new Map<
    string,
    { key: string; displayName: string; values: Record<string, string> }
  >();

  for (const attribute of session.normalized) {
    const existing = rowsMap.get(attribute.key) || {
      key: attribute.key,
      displayName: attribute.displayName,
      values: {}
    };
    existing.values[attribute.documentId] = attribute.value;
    rowsMap.set(attribute.key, existing);
  }

  const rows = Array.from(rowsMap.values()).sort((a, b) =>
    a.displayName.localeCompare(b.displayName)
  );
  const headers = ["Attribute", ...documents.map((doc) => doc.filename)];
  const csvRows = rows.map((row) => [
    row.displayName,
    ...documents.map((doc) => row.values[doc.id] || "")
  ]);

  const verdict = buildVerdict(
    documents.map((doc) => ({ id: doc.id, filename: doc.filename })),
    rows.map((row) => ({
      key: row.key,
      displayName: row.displayName,
      values: row.values
    }))
  );

  const emptyRow = new Array(headers.length).fill("");
  const metricsByKey = new Map(verdict.metrics.map((metric) => [metric.key, metric]));
  const verdictRows: string[][] = [
    emptyRow,
    ["Final Verdict Score", "", ...emptyRow.slice(2)],
    [
      "Strategic Strength",
      String(metricsByKey.get("strategicStrength")?.score ?? 0),
      metricsByKey.get("strategicStrength")?.detail ?? ""
    ],
    [
      "Credibility",
      String(metricsByKey.get("credibility")?.score ?? 0),
      metricsByKey.get("credibility")?.detail ?? ""
    ],
    [
      "Seniority Signal",
      String(metricsByKey.get("senioritySignal")?.score ?? 0),
      metricsByKey.get("senioritySignal")?.detail ?? ""
    ],
    [
      "Risk Level",
      String(metricsByKey.get("riskLevel")?.score ?? 0),
      metricsByKey.get("riskLevel")?.detail ?? ""
    ],
    [
      "Overall Recommendation",
      verdict.recommendation.title,
      verdict.recommendation.detail
    ],
    emptyRow,
    ["Document Scorecard", "", ...emptyRow.slice(2)],
    ...verdict.documentScores.map((doc) => [
      doc.filename,
      String(doc.score),
      `Completeness ${doc.completeness} | Numeric ${doc.numericPerformance} | Key ${doc.keyCoverage}`
    ])
  ];

  const csv = buildCsv(headers, [...csvRows, ...verdictRows]);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="session-${session.id}.csv"`
    }
  });
}
