import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/db";
import { buildVerdict } from "../../../../../lib/verdict";
import { buildDecisionSummary } from "../../../../../lib/decisionEngine";

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

  const documents = session.documents.map((doc) => ({
    id: doc.id,
    filename: doc.filename
  }));
  const verdict = buildVerdict(documents, rows);
  const decision = buildDecisionSummary(documents, rows);

  return NextResponse.json({
    status: session.status,
    documents,
    rows,
    verdict,
    decision
  });
}
