import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx-js-style";
import { getUserFromRequest } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/db";
import {
  buildExcelModel,
  classifyLens,
  LENS_LABELS,
  parseLensParam,
  type StrictDocumentInput
} from "../../../../../lib/strictDecisionComparison";

export const runtime = "nodejs";

type CellStyle = {
  font?: { bold?: boolean; color?: { rgb: string } };
  fill?: { patternType: "solid"; fgColor: { rgb: string } };
  alignment?: {
    wrapText?: boolean;
    vertical?: "top" | "center" | "bottom";
    horizontal?: "left" | "center" | "right";
  };
  border?: {
    top?: { style: "thin"; color: { rgb: string } };
    bottom?: { style: "thin"; color: { rgb: string } };
    left?: { style: "thin"; color: { rgb: string } };
    right?: { style: "thin"; color: { rgb: string } };
  };
};

const BORDER_GRAY = { style: "thin" as const, color: { rgb: "E5E7EB" } };

const JD_STOPWORDS = new Set(
  [
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "by",
    "for",
    "from",
    "in",
    "into",
    "is",
    "it",
    "of",
    "on",
    "or",
    "that",
    "the",
    "this",
    "to",
    "with",
    "will",
    "you",
    "your",
    "our",
    "we",
    "they",
    "their",
    "experience",
    "skills",
    "strong",
    "ability",
    "must",
    "nice",
    "have",
    "role",
    "requirements",
    "responsibilities",
    "preferred",
    "plus",
    "years"
  ].map((w) => w.toLowerCase())
);

const JD_PHRASES = [
  "product management",
  "stakeholder management",
  "roadmap",
  "go-to-market",
  "user research",
  "agile",
  "scrum",
  "safe",
  "kanban",
  "jira",
  "confluence",
  "sql",
  "analytics",
  "kpi",
  "okrs",
  "a/b",
  "experimentation",
  "api",
  "microservices",
  "saas",
  "b2b",
  "b2c",
  "pricing",
  "discovery",
  "delivery"
];

function normalizeForMatch(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9+\-/\s]/g, " ").replace(/\s+/g, " ").trim();
}

function extractJdKeywords(jdText: string) {
  const normalized = normalizeForMatch(jdText);
  const foundPhrases = JD_PHRASES.filter((p) => normalized.includes(p));

  const words = normalized
    .split(" ")
    .map((w) => w.trim())
    .filter((w) => w.length >= 3 && !JD_STOPWORDS.has(w));

  const counts = new Map<string, number>();
  for (const w of words) counts.set(w, (counts.get(w) ?? 0) + 1);

  const topWords = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([w]) => w)
    .filter((w) => !foundPhrases.includes(w))
    .slice(0, 12);

  return Array.from(new Set([...foundPhrases, ...topWords])).slice(0, 12);
}

function applyJdContextToModel(params: {
  model: ReturnType<typeof buildExcelModel>;
  jdText: string;
}) {
  const { model, jdText } = params;
  const trimmed = jdText.trim();
  if (trimmed.length === 0) return model;

  const keywords = extractJdKeywords(trimmed);
  const note = keywords.length > 0 ? `JD keywords: ${keywords.join(", ")}.` : "JD context applied.";

  // Sheet 1: add JD note to Role Fit + Overall Recommendation without changing columns/sheets.
  for (let i = 1; i < model.executiveScorecard.length; i += 1) {
    const row = model.executiveScorecard[i];
    const dimension = String(row[0] ?? "");
    if (dimension === "Role Fit") {
      row[4] = `${String(row[4] ?? "")}\n${note}`;
    }
    if (dimension === "Overall Recommendation") {
      row[4] = `${String(row[4] ?? "")} JD context used.`;
    }
  }

  // Sheet 2: append JD note to Role Fit decision impact.
  for (let i = 1; i < model.sideBySide.length; i += 1) {
    const row = model.sideBySide[i];
    const dimension = String(row[0] ?? "");
    if (dimension === "Role Fit") {
      row[5] = `${String(row[5] ?? "")}\n${note}`;
    }
  }

  return model;
}

function applySheetFormatting(params: {
  sheet: XLSX.WorkSheet;
  headerRowIndex: number; // 0-based
  columnWidths: number[]; // wch per column
}) {
  const { sheet, headerRowIndex, columnWidths } = params;
  if (!sheet["!ref"]) return;

  sheet["!cols"] = columnWidths.map((wch) => ({ wch }));

  const range = XLSX.utils.decode_range(sheet["!ref"]);
  const headerStyle: CellStyle = {
    font: { bold: true, color: { rgb: "FFFFFF" } },
    fill: { patternType: "solid", fgColor: { rgb: "111827" } },
    alignment: { wrapText: true, vertical: "center" },
    border: { top: BORDER_GRAY, bottom: BORDER_GRAY, left: BORDER_GRAY, right: BORDER_GRAY }
  };

  const bodyStyle: CellStyle = {
    alignment: { wrapText: true, vertical: "top" },
    border: { top: BORDER_GRAY, bottom: BORDER_GRAY, left: BORDER_GRAY, right: BORDER_GRAY }
  };

  for (let r = range.s.r; r <= range.e.r; r += 1) {
    for (let c = range.s.c; c <= range.e.c; c += 1) {
      const address = XLSX.utils.encode_cell({ r, c });
      const cell = sheet[address];
      if (!cell) continue;
      cell.s = r === headerRowIndex ? headerStyle : bodyStyle;
    }
  }

  sheet["!sheetViews"] = [
    {
      pane: {
        ySplit: headerRowIndex + 1,
        topLeftCell: XLSX.utils.encode_cell({ r: headerRowIndex + 1, c: 0 }),
        activePane: "bottomLeft",
        state: "frozen"
      }
    }
  ];
}

async function handleExport(params: {
  request: NextRequest;
  sessionId: string;
  jdText?: string;
}) {
  const { request, sessionId, jdText } = params;
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

  const docIdsParam = request.nextUrl.searchParams.get("docIds");
  const requestedIds =
    docIdsParam
      ? docIdsParam
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean)
      : [];

  const docs =
    requestedIds.length === 2
      ? session.documents.filter((d) => requestedIds.includes(d.id))
      : session.documents.slice(0, 2);

  const docA = docs[0] ?? null;
  const docB = docs[1] ?? null;

  if (!docA || !docB) {
    return NextResponse.json(
      { error: "Export requires exactly two documents." },
      { status: 400 }
    );
  }

  const selectedDocIds = new Set([docA.id, docB.id]);
  const rowsMap = new Map<
    string,
    { key: string; displayName: string; values: Record<string, string> }
  >();

  for (const attribute of session.normalized) {
    if (!selectedDocIds.has(attribute.documentId)) continue;
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

  const textFor = (doc: typeof docA) => {
    const normalized = doc.extracted.find((field) => field.name === "__normalized_text__")?.value;
    const raw = doc.extracted.find((field) => field.name === "__raw_text__")?.value;
    return (normalized || raw || "").trim();
  };

  const inputA: StrictDocumentInput = {
    id: docA.id,
    filename: docA.filename,
    normalizedText: textFor(docA),
    attributes: attributesFor(docA.id)
  };

  const inputB: StrictDocumentInput = {
    id: docB.id,
    filename: docB.filename,
    normalizedText: textFor(docB),
    attributes: attributesFor(docB.id)
  };

  // Hardcoded to HIRING lens for MVP
  const lens: "HIRING" = "HIRING";

  try {
    const rawModel = buildExcelModel({
      lens,
      docA: inputA,
      docB: inputB
    });

    const model = applyJdContextToModel({ model: rawModel, jdText: jdText ?? "" });

    const workbook = XLSX.utils.book_new();

    const scorecardSheet = XLSX.utils.aoa_to_sheet(model.executiveScorecard);
    applySheetFormatting({
      sheet: scorecardSheet,
      headerRowIndex: 0,
      columnWidths: [28, 22, 22, 16, 72]
    });
    XLSX.utils.book_append_sheet(
      workbook,
      scorecardSheet,
      "EXECUTIVE DECISION SCORECARD"
    );

    const sideBySideSheet = XLSX.utils.aoa_to_sheet(model.sideBySide);
    applySheetFormatting({
      sheet: sideBySideSheet,
      headerRowIndex: 0,
      columnWidths: [22, 54, 54, 30, 18, 66]
    });
    XLSX.utils.book_append_sheet(workbook, sideBySideSheet, "SIDE-BY-SIDE EVALUATION");

    const improvementSheet = XLSX.utils.aoa_to_sheet(model.improvementPlan);
    applySheetFormatting({
      sheet: improvementSheet,
      headerRowIndex: 0,
      columnWidths: [22, 76, 30, 18, 56]
    });
    // Excel enforces a 31 char sheet-name limit.
    XLSX.utils.book_append_sheet(
      workbook,
      improvementSheet,
      "IMPROVEMENT PLAN (LOSING DOC)"
    );

    const riskSheet = XLSX.utils.aoa_to_sheet(model.riskAnalysis);
    applySheetFormatting({
      sheet: riskSheet,
      headerRowIndex: 0,
      columnWidths: [22, 46, 56, 20, 56]
    });
    XLSX.utils.book_append_sheet(workbook, riskSheet, "RISK ANALYSIS");

    const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });

    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="decision-compare-${session.id}.xlsx"`
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `Excel export failed: ${error.message}`
            : "Excel export failed."
      },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  return handleExport({ request, sessionId: params.sessionId });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const body = (await request.json().catch(() => null)) as { jdText?: unknown } | null;
  const jdText = typeof body?.jdText === "string" ? body.jdText : "";
  return handleExport({ request, sessionId: params.sessionId, jdText });
}

