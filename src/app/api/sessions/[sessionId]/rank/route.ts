import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/db";
import { decideLensForMany, rankDocuments } from "../../../../../lib/multiDocRanking";
import type { StrictDocumentInput } from "../../../../../lib/strictDecisionComparison";

export const runtime = "nodejs";

function buildAttributesForSession(params: {
  normalized: { documentId: string; key: string; displayName: string; value: string }[];
  documentIds: string[];
}) {
  const { normalized, documentIds } = params;
  const selected = new Set(documentIds);
  const rowsMap = new Map<
    string,
    { key: string; displayName: string; values: Record<string, string> }
  >();

  for (const attribute of normalized) {
    if (!selected.has(attribute.documentId)) continue;
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

  const attributesFor = (documentId: string) =>
    rows
      .map((row) => ({
        key: row.key,
        displayName: row.displayName,
        value: row.values[documentId] ?? ""
      }))
      .filter((item) => item.value.trim().length > 0);

  return { attributesFor };
}

function textFor(doc: { extracted: { name: string; value: string }[] }) {
  const normalized = doc.extracted.find((field) => field.name === "__normalized_text__")?.value;
  const raw = doc.extracted.find((field) => field.name === "__raw_text__")?.value;
  return (normalized || raw || "").trim();
}

async function handler(params: {
  request: NextRequest;
  sessionId: string;
  contextText?: string;
}) {
  const { request, sessionId, contextText } = params;
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const session = await prisma.comparisonSession.findFirst({
    where: { id: sessionId, userId: user.id },
    include: {
      documents: {
        orderBy: { createdAt: "asc" },
        include: { extracted: true }
      },
      normalized: true
    }
  });

  if (!session) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  const docs = session.documents.slice(0, 5);
  if (docs.length < 2) {
    return NextResponse.json(
      { error: "Upload at least two documents to rank." },
      { status: 400 }
    );
  }

  const { attributesFor } = buildAttributesForSession({
    normalized: session.normalized,
    documentIds: docs.map((d) => d.id)
  });

  const inputs: StrictDocumentInput[] = docs.map((doc) => ({
    id: doc.id,
    filename: doc.filename,
    normalizedText: textFor(doc),
    attributes: attributesFor(doc.id)
  }));

  const auto = decideLensForMany({
    requestedLensParam: request.nextUrl.searchParams.get("lens"),
    docs: inputs
  });

  if (auto.confidence < 80 && !request.nextUrl.searchParams.get("lens")) {
    return NextResponse.json(
      {
        error: `Unable to confidently classify decision lens (confidence ${auto.confidence}%). Please select one: hiring, rfp, sales.`,
        detected: auto.lens,
        confidence: auto.confidence
      },
      { status: 422 }
    );
  }

  const ranked = rankDocuments({
    lens: auto.lens,
    docs: inputs,
    contextText: contextText ?? ""
  });

  return NextResponse.json({
    status: session.status,
    lens: ranked.lens,
    documentCount: docs.length,
    contextUsed: Boolean(ranked.context),
    contextKeywords: ranked.context?.keywords ?? [],
    ranked: ranked.ranked
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  return handler({ request, sessionId: params.sessionId });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const body = (await request.json().catch(() => null)) as
    | { contextText?: unknown }
    | null;
  const contextText = typeof body?.contextText === "string" ? body.contextText : "";
  return handler({ request, sessionId: params.sessionId, contextText });
}

