import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/db";
import { buildVerdict } from "../../../../../lib/verdict";
import { buildDecisionSummary } from "../../../../../lib/decisionEngine";
import { aiEnhanceVerdict } from "../../../../../lib/ai/aiVerdict";
import { isAiEnabled } from "../../../../../lib/ai/geminiClient";

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

  // Rule-based baseline (always computed — used as fallback)
  const baseVerdict = buildVerdict(documents, rows);
  const baseDecision = buildDecisionSummary(documents, rows);

  // AI enhancement: enriches metric details and recommendation text
  // Gracefully falls back to rule-based if AI fails or key is missing
  let aiRan = false;
  let verdict = baseVerdict;
  let decision = baseDecision;

  if (isAiEnabled()) {
    const aiResult = await aiEnhanceVerdict(documents, rows, baseVerdict, baseDecision);
    // aiEnhanceVerdict returns baseVerdict when AI fails — detect this by checking
    // if the recommendation detail changed (AI writes richer detail)
    if (aiResult.verdict.recommendation.detail !== baseVerdict.recommendation.detail) {
      verdict = aiResult.verdict;
      decision = aiResult.decision;
      aiRan = true;
    }
  }

  return NextResponse.json({
    status: session.status,
    aiPowered: aiRan,
    documents,
    rows,
    verdict,
    decision
  });
}
