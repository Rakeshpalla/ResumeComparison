import {
  LENS_DIMENSIONS,
  parseLensParam,
  classifyLens,
  scoreSingleDocument,
  type DecisionLens,
  type StrictDocumentInput,
  type SingleDocumentScore
} from "./strictDecisionComparison";
import { calculateEnhancedMetadata, type EnhancedMetadata } from "./enhancedMetadata";

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
    scoreReason: string;
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
  /** Optional: tie-breakers and confidence; added when enhancement is enabled. */
  enhanced?: EnhancedMetadata;
};

const STOPWORDS = new Set(
  [
    "a", "an", "and", "are", "as", "at", "be", "by", "for", "from",
    "in", "into", "is", "it", "of", "on", "or", "that", "the", "this",
    "to", "with", "will", "you", "your", "our", "we", "they", "their",
    "experience", "skills", "strong", "ability", "must", "nice", "have",
    "role", "requirements", "responsibilities", "preferred", "plus", "years"
  ].map((w) => w.toLowerCase())
);

const CONTEXT_PHRASES: Record<DecisionLens, string[]> = {
  HIRING: [
    "product management", "stakeholder management", "roadmap", "go-to-market",
    "user research", "agile", "scrum", "safe", "kanban", "jira", "confluence",
    "sql", "analytics", "kpi", "okrs", "a/b", "experimentation", "api",
    "microservices", "saas", "b2b", "b2c", "pricing", "discovery", "delivery"
  ],
  RFP: [
    "requirements", "scope", "deliverables", "timeline", "milestones",
    "implementation", "integration", "security", "compliance", "sla",
    "pricing", "terms", "assumptions", "dependencies"
  ],
  SALES: [
    "problem", "pain", "roi", "value proposition", "differentiation",
    "case study", "testimonial", "pricing", "next steps", "demo",
    "trial", "call to action"
  ]
};

function normalizeForMatch(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9+\-/\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Minimum word count for JD context to be treated as meaningful.
 * "Test" (1 word) = ignored — too vague for any matching.
 * "agriculture farming" (2 words) = used — domain-specific enough.
 */
const MIN_CONTEXT_WORDS = 2;

export function isContextMeaningful(contextText: string): boolean {
  const words = contextText.trim().split(/\s+/).filter((w) => w.length >= 2);
  return words.length >= MIN_CONTEXT_WORDS;
}

export function extractContextKeywords(params: {
  lens: DecisionLens;
  contextText: string;
}) {
  const { lens, contextText } = params;

  // If context is too short / vague, return empty keywords
  // so contextFitPercent falls to 0 instead of a misleading 100%.
  if (!isContextMeaningful(contextText)) return [];

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

/** Generate a human-readable reason for a dimension score */
function scoreReason(score: number, dimension: string, evidenceSnippet: string): string {
  const noProof = evidenceSnippet.toLowerCase().includes("no scoped proof") || evidenceSnippet.toLowerCase().includes("missing");

  if (score === 5) return `Strong: Resume contains measurable outcomes and specific ownership proof for ${dimension.toLowerCase()}.`;
  if (score === 4) return `Good: Solid evidence found for ${dimension.toLowerCase()}, but could be strengthened with more quantified results.`;
  if (score === 3) return `Average: Some relevant content found for ${dimension.toLowerCase()}, but lacks hard metrics or concrete ownership signals.`;
  if (score === 2) return `Weak: Limited evidence for ${dimension.toLowerCase()}. Claims are vague or generic without supporting proof.`;
  if (noProof) return `Missing: No concrete evidence found for ${dimension.toLowerCase()}. This is a gap that needs to be addressed.`;
  return `Very weak: Resume lacks meaningful proof for ${dimension.toLowerCase()}. Recruiter cannot validate claims.`;
}

/** Shorter version for risk bullets */
function scoreReasonBullet(score: number, evidenceSnippet: string): string {
  const noProof = evidenceSnippet.toLowerCase().includes("no scoped proof") || evidenceSnippet.toLowerCase().includes("missing");
  if (score >= 4) return "Evidence is present but could be stronger with quantified outcomes.";
  if (score === 3) return "Some signals found, but proof is generic \u2014 hard to validate in screening.";
  if (noProof) return "No concrete evidence found \u2014 this is a red flag for hiring confidence.";
  return "Claims are vague or unsupported \u2014 needs clarification before shortlisting.";
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
            : "What is the buyer's problem, and what proof do you have that your solution improves outcomes?"
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
        `Tell me about a recent example involving "${kw}". What was the baseline, what did you change, and what measurable result did you deliver (with timeframe)?`
    ),
    proofRequests: top.map(
      (kw) =>
        `Show an artifact proving "${kw}" (doc, dashboard, plan, slide) and explain your exact ownership.`
    )
  };
}

/**
 * Recommendation strength tiers — honest assessment for recruiters.
 * Avoids misleading "top pick" when nobody is actually strong.
 */
export type RecommendationStrength = "strong" | "moderate" | "weak" | "none";

export function assessRecommendation(params: {
  topTotal: number;
  gap: number; // gap between #1 and #2
  contextUsed: boolean;
  topContextFit: number;
}): { strength: RecommendationStrength; headline: string; subtext: string } {
  const { topTotal, gap, contextUsed, topContextFit } = params;

  const strongThreshold = 22;
  const adequateThreshold = 18;
  const weakThreshold = 14;

  // ── RULE 1: JD provided but NO candidate matches the role ──
  if (contextUsed && topContextFit < 20) {
    return {
      strength: "none",
      headline: "No candidate matches your job description",
      subtext: `The top resume scores ${topTotal}/30 on structure, but only ${topContextFit}% JD keyword match. These resumes don't align with the role you described. Consider sourcing candidates with relevant domain experience.`
    };
  }

  // ── RULE 2: All resumes are weak ──
  if (topTotal < weakThreshold) {
    return {
      strength: "none",
      headline: "No strong candidates found",
      subtext: "None of the uploaded resumes demonstrate enough quantified achievements, clear structure, or ownership signals to recommend. Consider requesting more detailed resumes or expanding your candidate pool."
    };
  }

  // ── RULE 3: Candidates are tied or nearly tied (gap 0-1) ──
  if (gap <= 1) {
    const jdHint = contextUsed
      ? "Review JD fit scores above to break the tie."
      : "Add a job description to differentiate candidates by role fit.";
    return {
      strength: "weak",
      headline: gap === 0
        ? "Candidates are evenly matched"
        : "Candidates are nearly tied",
      subtext: gap === 0
        ? `All top candidates scored ${topTotal}/30 — no meaningful difference in resume quality. ${jdHint}`
        : `The gap is only ${gap} point — too close to call based on resume alone. ${jdHint}`
    };
  }

  // ── RULE 4: Small gap (2-3 points), not decisive ──
  if (gap <= 3) {
    return {
      strength: "weak",
      headline: "Slight edge, but not decisive",
      subtext: `The top candidate leads by ${gap} points out of 30. This is a small gap — consider interviewing both before deciding. ${contextUsed ? "Check JD fit scores to see if one aligns better with the role." : "Add a JD to see which candidate fits the actual role better."}`
    };
  }

  // ── RULE 5: Clear frontrunner (gap 4+ and strong score) ──
  if (topTotal >= strongThreshold && gap >= 4) {
    const fitNote = contextUsed && topContextFit < 50
      ? " However, JD fit is moderate — verify role alignment in the interview."
      : "";
    return {
      strength: "strong",
      headline: "Clear frontrunner identified",
      subtext: `The top candidate leads by ${gap} points across 6 dimensions — a meaningful gap that signals stronger evidence of impact, clarity, and ownership.${fitNote}`
    };
  }

  // ── RULE 6: Moderate gap (4+) but score isn't outstanding ──
  return {
    strength: "moderate",
    headline: "One candidate shows a meaningful lead",
    subtext: `The top candidate leads by ${gap} points (${topTotal}/30 total). The gap is notable but the overall score isn't exceptional — interview both, but prioritize the leader. ${contextUsed ? "Cross-reference with JD fit scores." : "Add a JD for role-specific fit analysis."}`
  };
}

const TIE_BREAKER_THRESHOLD = 3;

/**
 * Original sort order: by total, contextFitPercent, clarity, riskHygiene, filename.
 * Used when enhanced ranking is disabled or when tie-breaker data is missing.
 */
function sortScoredOriginal(
  scored: (SingleDocumentScore & { contextFitPercent: number; matched: string[]; missing: string[] })[]
) {
  scored.sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    if (b.contextFitPercent !== a.contextFitPercent) return b.contextFitPercent - a.contextFitPercent;
    if (b.clarity !== a.clarity) return b.clarity - a.clarity;
    if (b.riskHygiene !== a.riskHygiene) return b.riskHygiene - a.riskHygiene;
    return a.doc.filename.localeCompare(b.doc.filename);
  });
}

/**
 * Re-sort ranked list using tie-breakers when scores are within TIE_BREAKER_THRESHOLD.
 * Preserves primary order by total score; only adjusts when gap <= threshold.
 */
const EMPTY_TIE_BREAKERS: EnhancedMetadata["tieBreakers"] = {
  criticalSkillMatchPercentage: null,
  experienceYears: 0,
  quantifiedAchievementsCount: 0,
  educationLevel: 0,
  careerProgressionScore: 0
};

function sortRankedWithTieBreakers(ranked: RankedDocument[]): RankedDocument[] {
  try {
    const sorted = [...ranked].sort((a, b) => {
      const scoreDiff = b.total - a.total;
      if (Math.abs(scoreDiff) > TIE_BREAKER_THRESHOLD) return scoreDiff;

      const aTie = a.enhanced?.tieBreakers ?? EMPTY_TIE_BREAKERS;
      const bTie = b.enhanced?.tieBreakers ?? EMPTY_TIE_BREAKERS;

      const aSkill = aTie.criticalSkillMatchPercentage ?? 0;
      const bSkill = bTie.criticalSkillMatchPercentage ?? 0;
      if (aSkill !== 0 || bSkill !== 0) {
        const skillDiff = bSkill - aSkill;
        if (Math.abs(skillDiff) > 5) return skillDiff;
      }

      const expDiff = (bTie.experienceYears ?? 0) - (aTie.experienceYears ?? 0);
      if (Math.abs(expDiff) > 1) return expDiff;

      const achievementDiff = (bTie.quantifiedAchievementsCount ?? 0) - (aTie.quantifiedAchievementsCount ?? 0);
      if (achievementDiff !== 0) return achievementDiff;

      const eduDiff = (bTie.educationLevel ?? 0) - (aTie.educationLevel ?? 0);
      if (eduDiff !== 0) return eduDiff;

      return scoreDiff !== 0 ? scoreDiff : (a.id || a.filename).localeCompare(b.id || b.filename);
    });
    return sorted.map((doc, idx) => ({ ...doc, rank: idx + 1 }));
  } catch (err) {
    console.error("Enhanced ranking failed, falling back to original order:", err);
    return ranked;
  }
}

export function rankDocuments(
  params: {
    lens: DecisionLens;
    docs: StrictDocumentInput[];
    contextText?: string;
  },
  options?: { useTieBreakers?: boolean }
): { lens: DecisionLens; dimensions: string[]; ranked: RankedDocument[]; recommendation: ReturnType<typeof assessRecommendation>; context?: RankingContext } {
  const { lens, docs, contextText } = params;
  const useTieBreakers = options?.useTieBreakers !== false;
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

  sortScoredOriginal(scored);

  const jdText = (contextText ?? "").trim();
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
          scoreReasonBullet(d.score, d.evidenceSnippet),
          level === "High"
            ? "Action: Ask candidate to provide concrete proof with measurable outcomes."
            : "Action: Probe for specifics in the interview \u2014 look for numbers and ownership signals."
        ]
      };
    });

    const kit = makeInterviewQuestions({ lens, missingKeywords: s.missing });
    const combined = `${s.doc.filename}\n${s.doc.normalizedText}\n${s.doc.attributes.map((a) => a.value).join("\n")}`;
    const enhanced = calculateEnhancedMetadata(combined, jdText);

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
        evidenceSnippet: d.evidenceSnippet,
        scoreReason: scoreReason(d.score, d.dimension, d.evidenceSnippet)
      })),
      risks,
      interviewKit: kit,
      enhanced
    };
  });

  const rankedFinal =
    useTieBreakers && ranked.length > 0 && ranked[0].enhanced
      ? sortRankedWithTieBreakers(ranked)
      : ranked;

  const topDoc = rankedFinal[0];
  const secondDoc = rankedFinal[1];
  const recommendation = assessRecommendation({
    topTotal: topDoc?.total ?? 0,
    gap: topDoc && secondDoc ? topDoc.total - secondDoc.total : 0,
    contextUsed: keywords.length > 0,
    topContextFit: topDoc?.contextFitPercent ?? 0
  });

  return {
    lens,
    dimensions,
    ranked: rankedFinal,
    recommendation,
    context:
      contextText && contextText.trim().length > 0
        ? { lens, contextText: contextText.trim(), keywords }
        : undefined
  };
}

/** Original ranking only (no tie-breaker re-sort). Use for comparison or rollback. */
export function rankDocumentsOriginal(params: {
  lens: DecisionLens;
  docs: StrictDocumentInput[];
  contextText?: string;
}) {
  return rankDocuments(params, { useTieBreakers: false });
}

/** Used by UI to decide whether to show "Close Match Insights" card. */
export function shouldShowCloseMatchInsights(ranked: RankedDocument[]): boolean {
  const top = ranked.slice(0, 3);
  if (top.length === 0) return false;
  const scores = top.map((c) => c.total);
  const range = Math.max(...scores) - Math.min(...scores);
  if (range > 5) return false;
  return top.every((c) => c.enhanced?.tieBreakers != null);
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
