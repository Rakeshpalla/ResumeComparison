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
    "role", "requirements", "responsibilities", "preferred", "plus", "years",
    // Recruiter-noise terms that always match any resume and pollute JD Fit %
    "team", "teams", "work", "working", "job", "jobs", "position", "positions",
    "candidate", "candidates", "applicant", "applicants", "opportunity",
    "product", "products", "business", "company", "organization",
    "environment", "industry", "background", "knowledge", "understanding",
    "including", "related", "similar", "other", "such", "can", "able",
    "good", "great", "excellent", "proven", "demonstrated", "passionate",
    "looking", "seeking", "hire", "hiring", "join", "join us", "apply",
    "must-have", "must-haves", "nice-to-have", "nice-to-haves", "day-to-day"
  ].map((w) => w.toLowerCase())
);

// Common JD ↔ resume synonyms so "ML" matches "machine learning".
// Values are all lowercase; a keyword matches if any alias appears in the resume.
const KEYWORD_ALIASES: Record<string, string[]> = {
  "ml": ["machine learning"],
  "machine learning": ["ml"],
  "ai": ["artificial intelligence"],
  "artificial intelligence": ["ai"],
  "nlp": ["natural language processing"],
  "js": ["javascript"],
  "javascript": ["js", "ecmascript"],
  "ts": ["typescript"],
  "typescript": ["ts"],
  "py": ["python"],
  "python": ["py"],
  "k8s": ["kubernetes"],
  "kubernetes": ["k8s"],
  "aws": ["amazon web services"],
  "gcp": ["google cloud", "google cloud platform"],
  "azure": ["microsoft azure"],
  "pm": ["product manager", "product management"],
  "product manager": ["pm", "product management"],
  "product management": ["pm", "product manager"],
  "ux": ["user experience"],
  "ui": ["user interface"],
  "qa": ["quality assurance"],
  "ci/cd": ["continuous integration", "continuous deployment", "cicd"],
  "cicd": ["ci/cd"],
  "sql": ["postgresql", "mysql", "postgres"],
  "nosql": ["mongodb", "dynamodb", "cassandra"],
  "react": ["react.js", "reactjs"],
  "node": ["node.js", "nodejs"],
  "rest": ["restful", "rest api"],
  "graphql": ["gql"]
};

/**
 * Domain concept clusters — free semantic intelligence.
 *
 * When a JD keyword belongs to one of these clusters, every other term
 * in the same cluster is treated as an alias. This makes "fintech" match
 * "payments", "banking" match "financial services", "devops" match "sre", etc.
 * without any API calls.
 */
const DOMAIN_CLUSTERS: string[][] = [
  // Finance / Fintech
  ["fintech", "payments", "banking", "financial services", "lending", "insurance", "wealth management", "capital markets"],
  // Healthcare
  ["healthcare", "health tech", "medtech", "clinical", "ehr", "electronic health records", "hipaa", "patient", "pharma"],
  // E-commerce / Retail
  ["ecommerce", "e-commerce", "retail", "marketplace", "checkout", "cart", "merchandising", "catalog"],
  // DevOps / SRE / Platform
  ["devops", "sre", "site reliability", "platform engineering", "infrastructure", "devsecops"],
  // Data roles
  ["data science", "data scientist", "data analyst", "analytics engineer", "bi", "business intelligence"],
  // Marketing
  ["growth", "performance marketing", "seo", "sem", "paid acquisition", "content marketing", "crm"],
  // Design
  ["ux", "user experience", "product design", "ui design", "user research", "usability"],
  // Security
  ["security", "cybersecurity", "appsec", "infosec", "pentest", "penetration testing", "soc", "devsecops"],
  // Mobile
  ["mobile", "ios", "android", "react native", "flutter", "swift", "kotlin"],
  // Cloud
  ["cloud", "aws", "azure", "gcp", "google cloud", "amazon web services"],
  // HR / Talent
  ["hr", "human resources", "talent acquisition", "recruiting", "people ops", "hris"],
];

/** Returns all aliases for a keyword including domain-cluster members. */
function allAliases(keyword: string): string[] {
  const kw = keyword.toLowerCase();
  const direct = KEYWORD_ALIASES[kw] ?? [];
  const clusterPeers: string[] = [];
  for (const cluster of DOMAIN_CLUSTERS) {
    if (cluster.includes(kw)) {
      clusterPeers.push(...cluster.filter((t) => t !== kw));
      break;
    }
  }
  return [...new Set([...direct, ...clusterPeers])];
}

const CONTEXT_PHRASES: Record<DecisionLens, string[]> = {
  HIRING: [
    "product management", "stakeholder management", "roadmap", "go-to-market",
    "user research", "agile", "scrum", "safe", "kanban", "jira", "confluence",
    "sql", "analytics", "kpi", "okrs", "a/b", "experimentation", "api",
    "microservices", "saas", "b2b", "b2c", "pricing", "discovery", "delivery",
    // AI / ML / data — include short acronyms AND spelled-out forms.
    // When a JD uses "ML", the alias map expands it to "machine learning"
    // at match time so resumes using either form get credit.
    "ml", "ai", "nlp", "llm",
    "machine learning", "artificial intelligence", "deep learning",
    "natural language processing", "computer vision", "data science",
    "data engineering", "mlops", "large language model",
    "recommender systems", "feature engineering"
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
    // Allow 2-char technical tokens (ml, ai, js, ts, py, ux, qa, pm) so the
    // alias map can resolve them to their long form in the resume.
    .filter((w) => w.length >= 2 && !STOPWORDS.has(w));

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

function keywordPresent(norm: string, keyword: string): boolean {
  const kw = keyword.toLowerCase();
  const variants = [kw, ...allAliases(kw)];
  for (const variant of variants) {
    // Word-boundary match for alpha-only tokens prevents "lead" matching
    // "leading" or "lead time" and "sql" matching "mysqli" etc.
    if (/^[a-z][a-z0-9]*$/.test(variant)) {
      const re = new RegExp(`\\b${variant}\\b`);
      if (re.test(norm)) return true;
    } else if (norm.includes(variant)) {
      return true;
    }
  }
  return false;
}

function matchKeywords(params: { keywords: string[]; haystack: string }) {
  const { keywords, haystack } = params;
  const norm = normalizeForMatch(haystack);
  const matched: string[] = [];
  const missing: string[] = [];
  for (const kw of keywords) {
    if (keywordPresent(norm, kw)) matched.push(kw);
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
  const cite = (!noProof && evidenceSnippet.trim().length > 0)
    ? ` e.g. "${evidenceSnippet.slice(0, 90)}${evidenceSnippet.length > 90 ? "…" : ""}"`
    : "";

  if (score === 5) return `Strong evidence with quantified outcomes and clear ownership.${cite}`;
  if (score === 4) return `Good evidence present, but could use more concrete metrics.${cite}`;
  if (score === 3) return `Some signals present, but proof is vague — hard to validate without interview.${cite}`;
  if (score === 2) return `Weak: claims are generic or unsupported.${cite}`;
  if (noProof) return `No concrete evidence found for ${dimension.toLowerCase()} — meaningful gap.`;
  return `Very weak signals — recruiter cannot validate claims without further screening.`;
}

/** Shorter version for risk bullets */
function scoreReasonBullet(score: number, evidenceSnippet: string): string {
  const noProof = evidenceSnippet.toLowerCase().includes("no scoped proof") || evidenceSnippet.toLowerCase().includes("missing");
  if (score >= 4) return "Evidence is present but could be stronger with quantified outcomes.";
  if (score === 3) return "Some signals found, but proof is generic \u2014 hard to validate in screening.";
  if (noProof) return "No concrete evidence found \u2014 this is a red flag for hiring confidence.";
  return "Claims are vague or unsupported \u2014 needs clarification before shortlisting.";
}

const HIRING_DIMENSION_PROMPTS: Record<string, { question: string; proof: string }> = {
  "Role Fit": {
    question:
      "Describe a project in the last 18 months that most closely resembles what this role would ask you to do on day one. What did you build, and which part of it was uniquely yours?",
    proof:
      "Share a PRD, architecture doc, or dashboard from that project; walk through your specific contribution vs the team's."
  },
  "Scope & Seniority": {
    question:
      "What is the largest scope you've personally owned — team size, budget, or business impact? Give a concrete number and the timeframe.",
    proof:
      "Share an org chart, roadmap, or OKR doc showing scope; name the stakeholders you aligned and the decisions you owned."
  },
  "Evidence & Metrics": {
    question:
      "Pick your most-impactful result. Give the baseline, the change you drove, the absolute number, and the measurement window. How was it attributed to your work?",
    proof:
      "Share the dashboard screenshot, experiment write-up, or report that measured the outcome."
  },
  "Ownership & Leadership": {
    question:
      "Describe a time you drove a cross-functional initiative end-to-end. Who else was involved, and what would have stalled without you?",
    proof:
      "Share a decision log, post-mortem, or retro doc that names you as the driver."
  },
  "Clarity & Structure": {
    question:
      "Walk me through a recent hard trade-off. Structure it as: context → options you considered → decision → result.",
    proof:
      "Share a written doc (RFC, proposal, 1-pager) you authored that was read by leadership."
  },
  "Risk Signals": {
    question:
      "Are there gaps, short stints, or transitions on the resume you'd want to explain up-front? Walk me through the context.",
    proof:
      "Offer two references who can speak to your last 24 months of work."
  }
};

function makeInterviewQuestions(params: {
  lens: DecisionLens;
  missingKeywords: string[];
  weakDimensions?: { dimension: string; score: number }[];
}) {
  const { lens, missingKeywords, weakDimensions } = params;
  const top = missingKeywords.slice(0, 2);
  const verify: string[] = [];
  const proof: string[] = [];

  // 1) JD-specific questions (only meaningful when the JD actually provided keywords).
  for (const kw of top) {
    verify.push(
      `"${kw}" is listed in the JD but not evident on the resume. Walk me through a project where you used it — baseline, change you drove, measurable outcome, and timeframe.`
    );
    proof.push(
      `Share an artifact proving "${kw}" (doc, dashboard, plan, PR, slide) and explain your exact ownership.`
    );
  }

  // 2) Dimension-targeted questions for the candidate's two weakest areas.
  // These are personalized per candidate so the interview kit doesn't repeat.
  if (lens === "HIRING" && weakDimensions && weakDimensions.length > 0) {
    for (const wd of weakDimensions.slice(0, 2)) {
      const prompt = HIRING_DIMENSION_PROMPTS[wd.dimension];
      if (!prompt) continue;
      verify.push(`[${wd.dimension} · ${wd.score}/5] ${prompt.question}`);
      proof.push(`[${wd.dimension}] ${prompt.proof}`);
    }
  }

  if (verify.length === 0) {
    verify.push(
      lens === "HIRING"
        ? "Walk me through your highest-impact project. What did you own, what changed, and what measurable result did you deliver?"
        : lens === "RFP"
          ? "Show how you will meet the top requirements and how you will prove acceptance in delivery."
          : "What is the buyer's problem, and what proof do you have that your solution improves outcomes?"
    );
  }
  if (proof.length === 0) {
    proof.push(
      lens === "HIRING"
        ? "Share an artifact (PRD/roadmap/dashboard) that shows your ownership and impact."
        : lens === "RFP"
          ? "Provide a requirements coverage matrix with referenced evidence sections."
          : "Provide a case study with baseline, metric change, and timeframe."
    );
  }

  return { verifyQuestions: verify, proofRequests: proof };
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

  const strongThreshold = 27;
  const adequateThreshold = 23;
  const weakThreshold = 18;

  // ── RULE 1: JD provided but NO candidate matches the role ──
  // This is the "astronomy JD vs PM resume" case — refuse to recommend
  // anyone. Copy is explicit about domain mismatch so recruiters don't
  // over-trust the ranking.
  if (contextUsed && topContextFit < 20) {
    return {
      strength: "none",
      headline: "None of these resumes match the job description",
      subtext:
        topContextFit === 0
          ? `Zero keyword overlap between the JD and any resume. The candidates may have well-structured resumes, but their experience is in a different domain than what you described. Source candidates with relevant domain experience — ranking these further would be misleading.`
          : `The strongest resume only overlaps ${topContextFit}% with the JD keywords. These resumes don't align with the role you described. Ranking order is based on general resume quality, not role fit — treat the #1 slot with caution.`
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

    const kit = makeInterviewQuestions({
      lens,
      missingKeywords: s.missing,
      weakDimensions: weakDims.map((d) => ({ dimension: d.dimension, score: d.score }))
    });
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
      matchedKeywords: s.matched.slice(0, 12),
      missingKeywords: s.missing.slice(0, 12),
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
