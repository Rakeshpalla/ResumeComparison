import {
  LENS_DIMENSIONS,
  parseLensParam,
  classifyLens,
  scoreSingleDocument,
  type DecisionLens,
  type StrictDocumentInput,
  type SingleDocumentScore
} from "./strictDecisionComparison";

export type RankingContext = {
  lens: DecisionLens;
  contextText: string;
  keywords: string[];
};

export type RankedDocument = {
  id: string;
  filename: string;
  rank: number;
  total: number;
  clarity: number;
  riskHygiene: number;
  contextFitPercent: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  dimensions: {
    dimension: string;
    score: number;
    evidenceSnippet: string;
  }[];
  risks: {
    riskType: string;
    level: "High" | "Medium" | "Low";
    bullets: string[];
  }[];
  interviewKit: {
    verifyQuestions: string[];
    proofRequests: string[];
  };
};

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

const CONTEXT_PHRASES: Record<DecisionLens, string[]> = {
  HIRING: [
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
  ],
  RFP: [
    "requirements",
    "scope",
    "deliverables",
    "timeline",
    "milestones",
    "implementation",
    "integration",
    "security",
    "compliance",
    "sla",
    "pricing",
    "terms",
    "assumptions",
    "dependencies"
  ],
  SALES: [
    "problem",
    "pain",
    "roi",
    "value proposition",
    "differentiation",
    "case study",
    "testimonial",
    "pricing",
    "next steps",
    "demo",
    "trial",
    "call to action"
  ]
};

function normalizeForMatch(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9+\-/\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractContextKeywords(params: {
  lens: DecisionLens;
  contextText: string;
}) {
  const { lens, contextText } = params;
  const normalized = normalizeForMatch(contextText);
  const foundPhrases = CONTEXT_PHRASES[lens].filter((p) => normalized.includes(p));

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
  return keywords;
}

function matchKeywords(params: { keywords: string[]; haystack: string }) {
  const { keywords, haystack } = params;
  const norm = normalizeForMatch(haystack);
  const matched: string[] = [];
  const missing: string[] = [];
  for (const kw of keywords) {
    if (norm.includes(kw.toLowerCase())) matched.push(kw);
    else missing.push(kw);
  }
  const fit = keywords.length > 0 ? Math.round((matched.length / keywords.length) * 100) : 0;
  return { fit, matched, missing };
}

function riskTypeForDimension(lens: DecisionLens, dimension: string) {
  if (lens === "HIRING") {
    if (dimension === "Role Fit") return "Role mismatch";
    if (dimension === "Scope & Seniority") return "Scope ambiguity";
    if (dimension === "Evidence & Metrics") return "Missing metrics";
    if (dimension === "Ownership & Leadership") return "Leadership inflation";
    if (dimension === "Clarity & Structure") return "Inconsistency";
    return "Over-claiming";
  }
  if (lens === "RFP") {
    if (dimension === "Requirement Coverage") return "Requirement gaps";
    if (dimension === "Delivery & Execution Plan") return "Delivery risk";
    if (dimension === "Risk & Compliance") return "Compliance ambiguity";
    if (dimension === "Commercial Clarity") return "Commercial opacity";
    if (dimension === "Solution Fit") return "Dependency risk";
    return "Over-promising";
  }
  // SALES
  if (dimension === "Differentiation") return "Weak differentiation";
  if (dimension === "Proof & Credibility") return "Unsupported claims";
  if (dimension === "Narrative Flow") return "Confusing narrative";
  if (dimension === "Call to Action Strength") return "Missing CTA";
  return "Audience mismatch";
}

function riskLevelForScore(score: number): "High" | "Medium" | "Low" {
  if (score <= 2) return "High";
  if (score === 3) return "Medium";
  return "Low";
}

function makeInterviewQuestions(params: {
  lens: DecisionLens;
  missingKeywords: string[];
}) {
  const { lens, missingKeywords } = params;
  const top = missingKeywords.slice(0, 3);
  if (top.length === 0) {
    return {
      verifyQuestions: [
        lens === "HIRING"
          ? "Walk me through your highest-impact project. What did you own, what changed, and what measurable result did you deliver?"
          : lens === "RFP"
            ? "Show how you will meet the top requirements and how you will prove acceptance in delivery."
            : "What is the buyer’s problem, and what proof do you have that your solution improves outcomes?"
      ],
      proofRequests: [
        lens === "HIRING"
          ? "Share an artifact (PRD/roadmap/dashboard) that shows your ownership and impact."
          : lens === "RFP"
            ? "Provide a requirements coverage matrix with referenced evidence sections."
            : "Provide a case study with baseline, metric change, and timeframe."
      ]
    };
  }
  return {
    verifyQuestions: top.map(
      (kw) =>
        `Tell me about a recent example involving “${kw}”. What was the baseline, what did you change, and what measurable result did you deliver (with timeframe)?`
    ),
    proofRequests: top.map(
      (kw) =>
        `Show an artifact proving “${kw}” (doc, dashboard, plan, slide) and explain your exact ownership.`
    )
  };
}

export function rankDocuments(params: {
  lens: DecisionLens;
  docs: StrictDocumentInput[];
  contextText?: string;
}): { lens: DecisionLens; dimensions: string[]; ranked: RankedDocument[]; context?: RankingContext } {
  const { lens, docs, contextText } = params;
  const dimensions = LENS_DIMENSIONS[lens];
  const keywords = contextText && contextText.trim().length > 0 ? extractContextKeywords({ lens, contextText }) : [];

  const scored: (SingleDocumentScore & {
    contextFitPercent: number;
    matched: string[];
    missing: string[];
  })[] = docs.map((doc) => {
    const score = scoreSingleDocument({ lens, doc });
    const combined = `${doc.filename}\n${doc.normalizedText}\n${doc.attributes.map((a) => a.value).join("\n")}`;
    const { fit, matched, missing } = matchKeywords({ keywords, haystack: combined });
    return { ...score, contextFitPercent: fit, matched, missing };
  });

  scored.sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    if (b.contextFitPercent !== a.contextFitPercent) return b.contextFitPercent - a.contextFitPercent;
    if (b.clarity !== a.clarity) return b.clarity - a.clarity;
    if (b.riskHygiene !== a.riskHygiene) return b.riskHygiene - a.riskHygiene;
    return a.doc.filename.localeCompare(b.doc.filename);
  });

  const ranked: RankedDocument[] = scored.map((s, idx) => {
    const weakDims = [...s.dimensions]
      .sort((a, b) => a.score - b.score)
      .slice(0, 2);
    const risks = weakDims.map((d) => {
      const riskType = riskTypeForDimension(lens, d.dimension);
      const level = riskLevelForScore(d.score);
      return {
        riskType,
        level,
        bullets: [
          `${d.dimension}: ${d.score}/5.`,
          `Observed: “${d.evidenceSnippet}”.`,
          level === "High"
            ? "High risk: missing or weak evidence in a critical dimension."
            : "Medium risk: evidence is present but not fully defensible."
        ]
      };
    });

    const kit = makeInterviewQuestions({ lens, missingKeywords: s.missing });

    return {
      id: s.doc.id,
      filename: s.doc.filename,
      rank: idx + 1,
      total: s.total,
      clarity: s.clarity,
      riskHygiene: s.riskHygiene,
      contextFitPercent: s.contextFitPercent,
      matchedKeywords: s.matched.slice(0, 6),
      missingKeywords: s.missing.slice(0, 6),
      dimensions: s.dimensions.map((d) => ({
        dimension: d.dimension,
        score: d.score,
        evidenceSnippet: d.evidenceSnippet
      })),
      risks,
      interviewKit: kit
    };
  });

  return {
    lens,
    dimensions,
    ranked,
    context:
      contextText && contextText.trim().length > 0
        ? { lens, contextText: contextText.trim(), keywords }
        : undefined
  };
}

export function decideLensForMany(params: {
  requestedLensParam: string | null;
  docs: StrictDocumentInput[];
}) {
  const requestedLens = parseLensParam(params.requestedLensParam);
  if (requestedLens) {
    return { lens: requestedLens, confidence: 100, rationale: "Manual lens selected." };
  }
  const docA = params.docs[0];
  const docB = params.docs[1] ?? params.docs[0];
  const auto = classifyLens(docA, docB);
  return auto;
}

