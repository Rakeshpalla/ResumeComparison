import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/db";
import {
  buildExcelModel,
  parseLensParam,
  type DecisionLens,
  type StrictDocumentInput
} from "../../../../../lib/strictDecisionComparison";

export const runtime = "nodejs";

const STOPWORDS = new Set(
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

const KNOWN_JD_PHRASES = [
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
  const foundPhrases = KNOWN_JD_PHRASES.filter((p) => normalized.includes(p));

  const words = normalized
    .split(" ")
    .map((w) => w.trim())
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));

  const counts = new Map<string, number>();
  for (const w of words) counts.set(w, (counts.get(w) ?? 0) + 1);

  const topWords = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([w]) => w)
    .filter((w) => !foundPhrases.includes(w))
    .slice(0, 12);

  const keywords = Array.from(new Set([...foundPhrases, ...topWords])).slice(0, 12);
  return { keywords };
}

function computeJdMatch(params: { keywords: string[]; candidateText: string }) {
  const { keywords, candidateText } = params;
  const haystack = normalizeForMatch(candidateText);
  const matched: string[] = [];
  const missing: string[] = [];
  for (const kw of keywords) {
    if (haystack.includes(kw.toLowerCase())) matched.push(kw);
    else missing.push(kw);
  }
  const matchPercent = keywords.length > 0 ? Math.round((matched.length / keywords.length) * 100) : 0;
  return { matchPercent, matched, missing };
}

function candidateDisplayNameFromFilename(filename: string) {
  const withoutExt = filename.replace(/\.[a-z0-9]+$/i, "");
  const cleaned = withoutExt
    .replace(/[_\-]+/g, " ")
    .replace(/\b(resume|cv|cover\s*letter)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.length > 0 ? cleaned : withoutExt;
}

function confidenceLabel(scoreDelta: number) {
  if (scoreDelta >= 6) return "High";
  if (scoreDelta >= 3) return "Medium";
  return "Low";
}

type VerdictStrength = "strong" | "moderate" | "weak" | "none";

function verdictStrength(params: { totalA: number; totalB: number; delta: number }): {
  strength: VerdictStrength;
  headline: string;
  subtext: string;
} {
  const { totalA, totalB, delta } = params;
  const topTotal = Math.max(totalA, totalB);
  const weakThreshold = 14;
  const adequateThreshold = 18;
  const strongThreshold = 22;

  if (topTotal < weakThreshold) {
    return {
      strength: "none",
      headline: "Neither candidate shows strong evidence",
      subtext: "Both resumes lack measurable outcomes and concrete ownership signals. Consider requesting more detailed resumes or expanding your candidate pipeline."
    };
  }
  if (topTotal < adequateThreshold || delta < 2) {
    return {
      strength: "weak",
      headline: "No clear winner between these two",
      subtext: `Scores are very close (${delta}-point gap). Interview both candidates and use structured questions to differentiate.`
    };
  }
  if (topTotal >= strongThreshold && delta >= 4) {
    return {
      strength: "strong",
      headline: "Clear frontrunner identified",
      subtext: `The recommended candidate leads by ${delta} points with demonstrably stronger evidence across key dimensions.`
    };
  }
  return {
    strength: "moderate",
    headline: "One candidate is relatively stronger",
    subtext: `There's a ${delta}-point edge, but consider interviewing both. The gap isn't decisive enough to skip the runner-up.`
  };
}

const RISK_TYPE_BY_DIMENSION: Record<string, string> = {
  "Role Fit": "Role mismatch",
  "Scope & Seniority": "Scope ambiguity",
  "Evidence & Metrics": "Missing metrics",
  "Ownership & Leadership": "Leadership inflation",
  "Clarity & Structure": "Inconsistency",
  "Risk Signals": "Over-claiming"
};

const RISK_RECOMMENDATION_BY_DIMENSION: Record<string, string> = {
  "Role Fit":
    "Add a 2–3 line role-fit summary aligned to the target role, and map 3 core skills to recent projects.",
  "Scope & Seniority":
    "Clarify scope (team size, budget, ownership) and seniority in the most recent role bullets.",
  "Evidence & Metrics":
    "Add quantified outcomes for top 3 achievements (metric + baseline + timeframe).",
  "Ownership & Leadership":
    "Add leadership proof: ownership verbs + cross-functional impact + decision scope.",
  "Clarity & Structure":
    "Reformat into clear sections and convert dense paragraphs into metric-led bullets.",
  "Risk Signals":
    "Address gaps/ambiguities with a one-line explanation and remove unclear claims."
};

function evidenceSnippet(value: string) {
  const cleaned = value
    .replace(/^\s*-\s*/gm, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 1)
    .join(" ");
  if (cleaned.length === 0) return "No scoped proof provided.";
  const oneLine = cleaned.replace(/\s+/g, " ").trim();
  const firstSentence = oneLine.split(/(?<=[.!?])\s+/)[0] || oneLine;
  const trimmed = firstSentence.slice(0, 120);
  return trimmed.length < firstSentence.length ? `${trimmed}…` : trimmed;
}

function analyzeEvidence(evidence: string) {
  const text = evidence.toLowerCase();
  const hasNumbers = /(\d+%|\b\d+\b|\$|€|£)/.test(text);
  const ownershipVerbs = /\b(owned|led|drove|managed|shipped|delivered|launched|implemented|designed|mentored)\b/i.test(
    evidence
  );
  const vagueClaims = /\b(experienced|results-driven|passionate|strong blend|world class|best in class)\b/i.test(
    evidence
  );
  const hasScopeSignals = /\b(team|stakeholder|cross-functional|roadmap|delivery|execution|budget|platform|enterprise)\b/i.test(
    evidence
  );
  return { hasNumbers, ownershipVerbs, vagueClaims, hasScopeSignals };
}

async function buildHiringUiResponse(params: {
  request: NextRequest;
  sessionId: string;
  jdText?: string;
}) {
  const { request, sessionId, jdText } = params;
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const lensParam = request.nextUrl.searchParams.get("lens");
  const requestedLens = parseLensParam(lensParam);
  const lens: DecisionLens = requestedLens ?? "HIRING";
  if (lens !== "HIRING") {
    return NextResponse.json(
      { error: "This endpoint is for hiring UI only." },
      { status: 400 }
    );
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

  const docs = session.documents.slice(0, 2);
  const docA = docs[0] ?? null;
  const docB = docs[1] ?? null;

  if (!docA || !docB) {
    return NextResponse.json(
      { error: "Upload exactly two resumes/CVs to generate a hiring decision." },
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
    const normalized = doc.extracted.find(
      (field) => field.name === "__normalized_text__"
    )?.value;
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

  const model = buildExcelModel({ lens: "HIRING", docA: inputA, docB: inputB });

  const scoreRows = model.executiveScorecard.slice(1, -1).map((row) => {
    const [dimension, aScore, bScore, winner, why] = row as [
      string,
      number,
      number,
      "A" | "B",
      string
    ];
    return { dimension, aScore, bScore, winner, why };
  });

  const totals = scoreRows.reduce(
    (acc, row) => ({
      a: acc.a + row.aScore,
      b: acc.b + row.bScore
    }),
    { a: 0, b: 0 }
  );

  const winnerFilename = model.overall.winner === "A" ? docA.filename : docB.filename;
  const loserFilename = model.overall.winner === "A" ? docB.filename : docA.filename;
  const winnerCandidateName = candidateDisplayNameFromFilename(winnerFilename);
  const loserCandidateName = candidateDisplayNameFromFilename(loserFilename);
  const delta = Math.abs(totals.a - totals.b);

  const byDimension = new Map(
    model.sideBySide.slice(1).map((row) => {
      const [
        dimension,
        aEvidence,
        bEvidence,
        keyDifference,
        stronger,
        decisionImpact
      ] = row as [string, string, string, string, "A" | "B", string];
      return [
        dimension,
        { aEvidence, bEvidence, keyDifference, stronger, decisionImpact }
      ] as const;
    })
  );

  const dimensionTable = scoreRows.map((row) => {
    const detail = byDimension.get(row.dimension);
    return {
      dimension: row.dimension,
      aScore: row.aScore,
      bScore: row.bScore,
      winner: row.winner,
      aEvidence: detail?.aEvidence ?? "- Missing: no scoped proof provided.",
      bEvidence: detail?.bEvidence ?? "- Missing: no scoped proof provided.",
      whyThisMatters: row.why,
      keyDifference:
        detail?.keyDifference ??
        "Winner provides clearer proof; the other side is less defensible.",
      decisionImpact:
        detail?.decisionImpact ??
        "Prefer the stronger candidate because it lowers hiring reversal risk."
    };
  });

  const riskRows = (() => {
    const buildCandidateRisks = (
      candidate: "A" | "B",
      candidateFilename: string,
      candidateName: string
    ) => {
      const rows: {
        riskType: string;
        observedSignal: string;
        whyItMatters: string;
        riskLevel: "High" | "Medium" | "Low";
        recommendation: string;
        appliesTo: "loser" | "both";
        candidateFilename: string | null;
        candidateName: string | null;
        gap: number;
        bullets: string[];
      }[] = [];

      for (const row of dimensionTable) {
        const detail = byDimension.get(row.dimension);
        const candidateScore = candidate === "A" ? row.aScore : row.bScore;
        const otherScore = candidate === "A" ? row.bScore : row.aScore;
        const gap = Math.max(0, otherScore - candidateScore);
        if (candidateScore > 2 && gap < 1) continue;

        const riskType = RISK_TYPE_BY_DIMENSION[row.dimension] ?? "Role mismatch";
        const evidence =
          candidate === "A"
            ? evidenceSnippet(detail?.aEvidence ?? "")
            : evidenceSnippet(detail?.bEvidence ?? "");

        let riskLevel: "High" | "Medium" | "Low" = "Low";
        if (candidateScore <= 1 || gap >= 2) riskLevel = "High";
        else if (candidateScore === 2 || gap === 1) riskLevel = "Medium";

        rows.push({
          riskType,
          observedSignal: `${row.dimension} is weak.`,
          whyItMatters:
            "Weak evidence here increases hiring risk and makes the decision hard to defend.",
          riskLevel,
          recommendation:
            RISK_RECOMMENDATION_BY_DIMENSION[row.dimension] ??
            "Add scoped proof and remove vague claims.",
          appliesTo: "loser",
          candidateFilename,
          candidateName,
          gap,
          bullets: (() => {
            const analysis = analyzeEvidence(evidence);
            const bullets: string[] = [];
            bullets.push(
              `${row.dimension}: ${candidateScore}/5 (other candidate: ${otherScore}/5).`
            );
            bullets.push(`Observed: “${evidence}”.`);

            if (row.dimension === "Evidence & Metrics" && !analysis.hasNumbers) {
              bullets.push("No quantified outcomes surfaced (metrics/timeframes missing).");
            }
            if (row.dimension === "Ownership & Leadership" && !analysis.ownershipVerbs) {
              bullets.push("Ownership/leadership signals are weak; reads more like responsibilities than outcomes.");
            }
            if (row.dimension === "Scope & Seniority" && !analysis.hasScopeSignals) {
              bullets.push("Scope is not grounded (ownership boundary/team/context not clear).");
            }
            if (analysis.vagueClaims) {
              bullets.push("Language is generic; needs verifiable bullets tied to scope and impact.");
            }

            bullets.push(
              `Fix: ${RISK_RECOMMENDATION_BY_DIMENSION[row.dimension] ?? "Add scoped proof and remove vague claims."}`
            );
            return bullets.slice(0, 5);
          })()
        });
      }

      const byType = new Map<string, (typeof rows)[0]>();
      for (const item of rows) {
        if (!byType.has(item.riskType)) {
          byType.set(item.riskType, item);
        }
      }
      const unique = Array.from(byType.values());

      if (unique.length === 0) {
        unique.push({
          riskType: "Missing metrics",
          observedSignal:
            "Quantified outcomes are limited or missing in key roles.",
          whyItMatters:
            "Without measurable impact, the hiring decision is harder to justify.",
          riskLevel: "Medium",
          recommendation:
            "Add 2–3 quantified impact bullets with metrics and timeframes.",
          appliesTo: "loser",
          candidateFilename,
          candidateName,
          gap: 1,
          bullets: [
            "Evidence & Metrics is weak relative to the JD or peer candidate.",
            "Observed: quantified outcomes are limited or missing in key roles.",
            "Fix: Add 2–3 quantified impact bullets with metrics and timeframes."
          ]
        });
      }

      const hasMediumOrHigh = unique.some(
        (item) => item.riskLevel !== "Low"
      );
      if (!hasMediumOrHigh) {
        const worst = unique.sort((a, b) => b.gap - a.gap)[0];
        if (worst) worst.riskLevel = "Medium";
      }

      return unique
        .sort((a, b) => {
          const levelRank = (level: "High" | "Medium" | "Low") =>
            level === "High" ? 3 : level === "Medium" ? 2 : 1;
          return levelRank(b.riskLevel) - levelRank(a.riskLevel);
        })
        .slice(0, 3);
    };

    const risksForA = buildCandidateRisks(
      "A",
      docA.filename,
      candidateDisplayNameFromFilename(docA.filename)
    );
    const risksForB = buildCandidateRisks(
      "B",
      docB.filename,
      candidateDisplayNameFromFilename(docB.filename)
    );

    return [...risksForA, ...risksForB].map((risk) => ({
      riskType: risk.riskType,
      observedSignal: risk.observedSignal,
      whyItMatters: risk.whyItMatters,
      riskLevel: risk.riskLevel,
      recommendation: risk.recommendation,
      appliesTo: risk.appliesTo,
      candidateFilename: risk.candidateFilename,
      candidateName: risk.candidateName,
      bullets: risk.bullets
    }));
  })();

  const trimmedJd = (jdText ?? "").trim();
  const jdContext =
    trimmedJd.length > 0
      ? (() => {
          const { keywords } = extractJdKeywords(trimmedJd);
          const aText = `${inputA.filename}\n${inputA.normalizedText}\n${inputA.attributes.map((a) => a.value).join("\n")}`;
          const bText = `${inputB.filename}\n${inputB.normalizedText}\n${inputB.attributes.map((a) => a.value).join("\n")}`;
          const aMatch = computeJdMatch({ keywords, candidateText: aText });
          const bMatch = computeJdMatch({ keywords, candidateText: bText });

          const overallWinnerFilename = model.overall.winner === "A" ? docA.filename : docB.filename;
          const loserFilename = model.overall.winner === "A" ? docB.filename : docA.filename;
          const loserMatch = model.overall.winner === "A" ? bMatch : aMatch;
          const winnerMatch = model.overall.winner === "A" ? aMatch : bMatch;

          const topMissing = loserMatch.missing.slice(0, 3);
          const topMatched = winnerMatch.matched.slice(0, 4);

          const interviewQuestions = topMissing.map(
            (kw) =>
              `Tell me about a recent project involving “${kw}”. What was the baseline, what did you change, and what measurable result did you deliver (with timeframe)?`
          );
          const proofRequests = topMissing.map(
            (kw) =>
              `Show an artifact proving “${kw}” work (PRD/roadmap/dashboard/spec) and explain your exact ownership.`
          );

          return {
            jdProvided: true,
            keywordCount: keywords.length,
            keywords,
            candidates: [
              {
                filename: docA.filename,
                candidateName: candidateDisplayNameFromFilename(docA.filename),
                matchPercent: aMatch.matchPercent,
                matched: aMatch.matched.slice(0, 6),
                missing: aMatch.missing.slice(0, 6)
              },
              {
                filename: docB.filename,
                candidateName: candidateDisplayNameFromFilename(docB.filename),
                matchPercent: bMatch.matchPercent,
                matched: bMatch.matched.slice(0, 6),
                missing: bMatch.missing.slice(0, 6)
              }
            ],
            defensibility: {
              whyWinnerWins: [
                `Winner (${overallWinnerFilename}) matches more JD keywords: ${winnerMatch.matchPercent}% vs ${loserMatch.matchPercent}%.`,
                topMatched.length > 0
                  ? `Winner aligns on: ${topMatched.join(", ")}.`
                  : "Winner has stronger alignment signals in the extracted text."
              ],
              whatWouldFlip: [
                topMissing.length > 0
                  ? `If ${loserFilename} demonstrates credible, recent evidence for: ${topMissing.join(", ")} (with metrics/timeframes), re-evaluate Role Fit.`
                  : `If ${loserFilename} provides stronger role-specific proof (metrics + ownership), re-evaluate Role Fit.`
              ],
              verifyInInterview: [
                ...interviewQuestions.slice(0, 3),
                ...(proofRequests.length > 0 ? [proofRequests[0]] : [])
              ].slice(0, 3)
            }
          };
        })()
      : { jdProvided: false as const };

  return NextResponse.json({
    lens: "HIRING",
    candidates: [
      {
        filename: docA.filename,
        candidateName: candidateDisplayNameFromFilename(docA.filename)
      },
      {
        filename: docB.filename,
        candidateName: candidateDisplayNameFromFilename(docB.filename)
      }
    ],
    verdict: {
      winnerFilename,
      winnerCandidateName,
      loserFilename,
      loserCandidateName,
      confidence: confidenceLabel(delta),
      rationale: model.overall.recommendation,
      totals: {
        [docA.filename]: totals.a,
        [docB.filename]: totals.b
      },
      verdictStrength: verdictStrength({ totalA: totals.a, totalB: totals.b, delta })
    },
    dimensions: dimensionTable,
    risks: riskRows,
    jdContext
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  return buildHiringUiResponse({ request, sessionId: params.sessionId });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const body = (await request.json().catch(() => null)) as { jdText?: unknown } | null;
  const jdText = typeof body?.jdText === "string" ? body.jdText : "";
  return buildHiringUiResponse({ request, sessionId: params.sessionId, jdText });
}

