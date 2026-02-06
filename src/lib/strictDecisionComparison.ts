export type DecisionLens = "HIRING" | "RFP" | "SALES";

export type StrictDocumentInput = {
  id: string;
  filename: string;
  normalizedText: string;
  attributes: { key: string; displayName: string; value: string }[];
};

export type LensClassification = {
  lens: DecisionLens;
  confidence: number; // 0-100
  rationale: string;
};

export const LENS_LABELS: Record<DecisionLens, string> = {
  HIRING: "HIRING DECISION",
  RFP: "RFP / PROPOSAL DECISION",
  SALES: "SALES / PITCH DECISION"
};

export const LENS_DIMENSIONS: Record<DecisionLens, string[]> = {
  HIRING: [
    "Role Fit",
    "Scope & Seniority",
    "Evidence & Metrics",
    "Ownership & Leadership",
    "Clarity & Structure",
    "Risk Signals"
  ],
  RFP: [
    "Requirement Coverage",
    "Solution Fit",
    "Evidence & Case Studies",
    "Delivery & Execution Plan",
    "Risk & Compliance",
    "Commercial Clarity"
  ],
  SALES: [
    "Problem Clarity",
    "Value Proposition",
    "Differentiation",
    "Proof & Credibility",
    "Narrative Flow",
    "Call to Action Strength"
  ]
};

export const LENS_RISKS: Record<DecisionLens, string[]> = {
  HIRING: [
    "Role mismatch",
    "Scope ambiguity",
    "Missing metrics",
    "Over-claiming",
    "Leadership inflation",
    "Inconsistency"
  ],
  RFP: [
    "Requirement gaps",
    "Delivery risk",
    "Compliance ambiguity",
    "Commercial opacity",
    "Dependency risk",
    "Over-promising"
  ],
  SALES: [
    "Weak differentiation",
    "Unsupported claims",
    "Confusing narrative",
    "Missing CTA",
    "Audience mismatch"
  ]
};

const EMPTY_VALUE = new Set(["", "-", "—", "n/a", "na", "not available", "unknown", "tbd"]);

function isEmpty(value: string | undefined) {
  if (!value) return true;
  return EMPTY_VALUE.has(value.trim().toLowerCase());
}

function clampInt(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function normalizeText(input: string) {
  return input.replace(/\s+/g, " ").trim().slice(0, 40000);
}

function tokens(input: string) {
  return normalizeText(input).toLowerCase();
}

function countHits(haystack: string, keywords: string[]) {
  let hits = 0;
  for (const keyword of keywords) {
    if (haystack.includes(keyword)) hits += 1;
  }
  return hits;
}

export function parseLensParam(param: string | null): DecisionLens | null {
  if (!param) return null;
  const value = param.trim().toLowerCase();
  if (value === "hiring") return "HIRING";
  if (value === "rfp") return "RFP";
  if (value === "sales") return "SALES";
  return null;
}

export function classifyLens(docA: StrictDocumentInput, docB: StrictDocumentInput): LensClassification {
  const combined = tokens(
    `${docA.filename} ${docB.filename} ${docA.normalizedText} ${docB.normalizedText}`
  );

  const hiringKeywords = [
    "resume",
    "curriculum vitae",
    "cv",
    "experience",
    "employment",
    "education",
    "skills",
    "projects",
    "linkedin",
    "certifications"
  ];
  const rfpKeywords = [
    "rfp",
    "proposal",
    "statement of work",
    "sow",
    "requirements",
    "scope",
    "deliverables",
    "compliance",
    "timeline",
    "pricing",
    "terms",
    "service levels",
    "sla"
  ];
  const salesKeywords = [
    "pitch",
    "deck",
    "problem",
    "solution",
    "value proposition",
    "roi",
    "case study",
    "testimonial",
    "next steps",
    "contact",
    "call to action",
    "competitive"
  ];

  const filenameHint = tokens(`${docA.filename} ${docB.filename}`);

  const hiringScore = countHits(combined, hiringKeywords) + countHits(filenameHint, ["resume", "cv"]);
  const rfpScore = countHits(combined, rfpKeywords) + countHits(filenameHint, ["rfp", "proposal", "sow"]);
  const salesScore = countHits(combined, salesKeywords) + countHits(filenameHint, ["pitch", "deck"]);

  const scored: { lens: DecisionLens; score: number }[] = [
    { lens: "HIRING", score: hiringScore },
    { lens: "RFP", score: rfpScore },
    { lens: "SALES", score: salesScore }
  ];
  scored.sort((a, b) => b.score - a.score);

  const top = scored[0];
  const second = scored[1];
  const total = hiringScore + rfpScore + salesScore;
  const confidenceRaw = total > 0 ? (top.score / (top.score + second.score + 1)) * 100 : 0;
  const confidence = clampInt(top.score >= 6 ? confidenceRaw : confidenceRaw * 0.6, 0, 99);

  return {
    lens: top.lens,
    confidence,
    rationale: `Detected strongest signals for ${LENS_LABELS[top.lens]} based on keywords in filenames and normalized text.`
  };
}

function extractCandidateLines(doc: StrictDocumentInput) {
  const lines = doc.normalizedText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const attributeLines = doc.attributes
    .filter((attr) => !isEmpty(attr.value))
    .map((attr) => `${attr.displayName}: ${attr.value}`);
  return [...attributeLines, ...lines];
}

function pickEvidence(lines: string[], keywords: string[], maxItems = 3) {
  const scored = lines
    .map((line) => {
      const lower = line.toLowerCase();
      const hit = countHits(lower, keywords);
      const hasNumber = /(\d+%|\d+\.\d+|\b\d+\b)/.test(line);
      const score = hit * 3 + (hasNumber ? 2 : 0) + Math.min(line.length / 60, 2);
      return { line, score };
    })
    .filter((item) => item.score >= 2.5)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxItems)
    .map((item) => item.line);

  return scored.length > 0 ? scored : ["No concrete evidence found."];
}

function dimensionKeywords(lens: DecisionLens, dimension: string) {
  const base = (words: string[]) => words;

  if (lens === "HIRING") {
    switch (dimension) {
      case "Role Fit":
        return base(["summary", "skills", "stack", "experience", "role", "engineer", "developer", "manager"]);
      case "Scope & Seniority":
        return base(["senior", "lead", "principal", "staff", "architect", "managed", "ownership", "scope"]);
      case "Evidence & Metrics":
        return base(["%", "reduced", "improved", "increased", "users", "latency", "cost", "revenue", "uptime"]);
      case "Ownership & Leadership":
        return base(["owned", "led", "drove", "mentored", "stakeholder", "strategy", "cross-functional"]);
      case "Clarity & Structure":
        return base(["experience", "education", "skills", "projects", "summary", "certifications"]);
      case "Risk Signals":
        return base(["gap", "contract", "inconsistent", "over", "claimed", "leadership", "mismatch"]);
      default:
        return [];
    }
  }

  if (lens === "RFP") {
    switch (dimension) {
      case "Requirement Coverage":
        return base(["requirements", "shall", "must", "coverage", "matrix", "compliance", "scope"]);
      case "Solution Fit":
        return base(["architecture", "approach", "integration", "api", "security", "design"]);
      case "Evidence & Case Studies":
        return base(["case study", "reference", "customer", "results", "metrics", "deployment"]);
      case "Delivery & Execution Plan":
        return base(["timeline", "milestone", "phase", "plan", "delivery", "implementation", "resources"]);
      case "Risk & Compliance":
        return base(["risk", "compliance", "iso", "soc", "gdpr", "sla", "security"]);
      case "Commercial Clarity":
        return base(["pricing", "cost", "terms", "license", "subscription", "payment", "commercial"]);
      default:
        return [];
    }
  }

  // SALES
  switch (dimension) {
    case "Problem Clarity":
      return base(["problem", "pain", "challenge", "today", "current", "cost of"]);
    case "Value Proposition":
      return base(["value", "benefit", "roi", "outcome", "reduce", "increase"]);
    case "Differentiation":
      return base(["different", "unique", "competitor", "vs", "differentiation", "why us"]);
    case "Proof & Credibility":
      return base(["proof", "case study", "testimonial", "metric", "customer", "results"]);
    case "Narrative Flow":
      return base(["agenda", "story", "overview", "solution", "proof", "next steps"]);
    case "Call to Action Strength":
      return base(["next steps", "schedule", "contact", "call to action", "demo", "trial"]);
    default:
      return [];
  }
}

function scoreFromEvidence(dimension: string, evidence: string[]) {
  const text = evidence.join("\n");
  const hasNumbers = /(\d+%|\b\d+\b|\$|€|£)/.test(text);
  const hasSpecific = evidence.some((line) => line.length >= 45);
  const hasScopeVerbs = /\b(owned|led|built|shipped|delivered|implemented|designed|launched|migrated|reduced|increased|improved)\b/i.test(
    text
  );
  const missing = evidence.length === 1 && evidence[0].toLowerCase().startsWith("missing:");

  // Base scoring: we deliberately avoid ties by rewarding proof density.
  let score = 1;
  if (!missing) score += 1; // at least some evidence exists
  if (hasScopeVerbs) score += 1; // scope/ownership signal
  if (hasSpecific) score += 1; // detail
  if (hasNumbers) score += 1; // proof/metrics -> strongest

  // Risk dimensions are scored as "risk hygiene" (higher is safer).
  if (dimension === "Risk Signals" || dimension === "Risk & Compliance") {
    const redFlags = /\b(maybe|approximately|tbd|asap|best in class|world class|guarantee|guaranteed)\b/i.test(
      text
    );
    if (missing) score = 2; // no evidence -> risky, but not absolute floor
    if (redFlags) score = Math.max(1, score - 1);
  }

  return clampInt(score, 1, 5);
}

function evidenceQuality(evidence: string[]) {
  const joined = evidence.join("\n");
  const numericHits = (joined.match(/(\d+%|\b\d+\b|\$|€|£)/g) || []).length;
  const longLines = evidence.filter((line) => line.length >= 50).length;
  const scopeHits =
    (joined.match(/\b(owned|led|built|shipped|delivered|implemented|designed|launched|migrated)\b/gi) || []).length;
  const missing = evidence.length === 1 && evidence[0].toLowerCase().startsWith("missing:");
  return (missing ? 0 : 10) + numericHits * 5 + longLines * 3 + scopeHits * 2;
}

function evidenceSnippet(evidence: string[]) {
  const cleaned = evidence
    .map((line) => line.replace(/^\s*-\s*/g, "").trim())
    .filter(Boolean)
    .find((line) => !line.toLowerCase().startsWith("missing:"));
  if (!cleaned || cleaned.length === 0) return "no scoped proof provided";
  const oneLine = cleaned.replace(/\s+/g, " ").trim();
  // Avoid pasting long resume paragraphs into UI/Excel cells.
  const firstSentence = oneLine.split(/(?<=[.!?])\s+/)[0] || oneLine;
  const trimmed = firstSentence.slice(0, 140);
  return trimmed.length < firstSentence.length ? `${trimmed}…` : trimmed;
}

function strengthLabel(gap: number) {
  if (gap >= 2) return "material";
  if (gap === 1) return "clear";
  return "slight";
}

function dimensionWhy(params: {
  lens: DecisionLens;
  dimension: string;
  aScore: number;
  bScore: number;
  winner: "A" | "B";
  aEvidence: string[];
  bEvidence: string[];
}) {
  const { lens, dimension, aScore, bScore, winner, aEvidence, bEvidence } = params;
  const winnerEvidence = winner === "A" ? aEvidence : bEvidence;
  const loserEvidence = winner === "A" ? bEvidence : aEvidence;
  const w = evidenceSnippet(winnerEvidence);
  const l = evidenceSnippet(loserEvidence);
  const gap = Math.abs(aScore - bScore);

  if (lens === "HIRING") {
    switch (dimension) {
      case "Role Fit":
        return [
          "Role Fit predicts day-1 effectiveness and ramp speed.",
          `Winner is more role-aligned (evidence: “${w}”).`,
          `Loser is less specific / harder to map (evidence: “${l}”).`
        ].join("\n");
      case "Scope & Seniority":
        return [
          "Scope & Seniority prevents mis-leveling (title vs actual scope).",
          `Winner’s scope reads defensible (evidence: “${w}”).`,
          `Loser’s scope is thin/unclear (evidence: “${l}”).`
        ].join("\n");
      case "Evidence & Metrics":
        return [
          "Evidence & Metrics makes claims verifiable (impact you can validate).",
          `Winner anchors impact with proof (evidence: “${w}”).`,
          `Loser lacks measurable outcomes (evidence: “${l}”).`
        ].join("\n");
      case "Ownership & Leadership":
        return [
          "Ownership & Leadership predicts execution without hand-holding.",
          `Winner shows ownership/leadership (evidence: “${w}”).`,
          `Loser reads more generic (evidence: “${l}”).`
        ].join("\n");
      case "Clarity & Structure":
        return [
          "Clarity & Structure reduces interpretation risk in evaluation.",
          `Winner is easier to validate quickly (evidence: “${w}”).`,
          `Loser forces guesswork / inference (evidence: “${l}”).`
        ].join("\n");
      case "Risk Signals":
        return [
          "Risk Signals indicate hidden hiring risk (gaps, inflated claims, inconsistencies).",
          `Winner is lower-risk (${strengthLabel(gap)} edge) based on evidence density.`,
          `Loser needs clarification (evidence: “${l}”).`
        ].join("\n");
      default:
        return [
          "This dimension reduces hiring risk when supported by evidence.",
          "Winner is stronger; loser is less defensible."
        ].join("\n");
    }
  }

  if (lens === "RFP") {
    switch (dimension) {
      case "Requirement Coverage":
        return `Coverage prevents gaps at delivery time. Winner maps requirements with evidence (“${w}”); loser leaves ambiguity (“${l}”).`;
      case "Solution Fit":
        return `Fit determines feasibility. Winner explains how it works (“${w}”); loser is less concrete (“${l}”).`;
      case "Evidence & Case Studies":
        return `Evidence reduces vendor risk. Winner provides proof (“${w}”); loser relies on claims (“${l}”).`;
      case "Delivery & Execution Plan":
        return `Execution detail predicts delivery success. Winner shows plan specifics (“${w}”); loser is under-specified (“${l}”).`;
      case "Risk & Compliance":
        return `Risk/Compliance avoids surprises. Winner is more defensible (“${w}”); loser needs clarification (“${l}”).`;
      case "Commercial Clarity":
        return `Commercial clarity prevents renegotiation. Winner is clearer (“${w}”); loser is opaque (“${l}”).`;
      default:
        return `This dimension determines whether the proposal survives scrutiny. Winner is more defensible than loser.`;
    }
  }

  // SALES
  switch (dimension) {
    case "Problem Clarity":
      return `Clarity drives urgency. Winner articulates the problem (“${w}”); loser is harder to follow (“${l}”).`;
    case "Value Proposition":
      return `Value must be explicit. Winner shows outcomes (“${w}”); loser is less concrete (“${l}”).`;
    case "Differentiation":
      return `Differentiation prevents commodity pricing. Winner is clearer (“${w}”); loser blends in (“${l}”).`;
    case "Proof & Credibility":
      return `Proof drives trust. Winner includes credibility (“${w}”); loser lacks proof (“${l}”).`;
    case "Narrative Flow":
      return `Flow reduces buyer confusion. Winner’s story is easier to follow (“${w}”); loser is choppy (“${l}”).`;
    case "Call to Action Strength":
      return `CTA converts interest into action. Winner gives next steps (“${w}”); loser is passive (“${l}”).`;
    default:
      return `This dimension determines buyer confidence. Winner is clearer and more credible than loser.`;
  }
}

function dimensionDecisionImpact(params: {
  lens: DecisionLens;
  dimension: string;
  winner: "A" | "B";
  gap: number;
}) {
  const { lens, dimension, winner, gap } = params;
  const strength = strengthLabel(gap);
  const pick = winner === "A" ? "A" : "B";

  if (lens === "HIRING") {
    switch (dimension) {
      case "Role Fit":
        return [
          `${strength} advantage → shortlist ${pick}.`,
          "Reduces role-mismatch risk and interview uncertainty."
        ].join("\n");
      case "Scope & Seniority":
        return [
          `${strength} advantage → prefer ${pick}.`,
          "Lowers mis-leveling and ramp risk."
        ].join("\n");
      case "Evidence & Metrics":
        return [
          `${strength} advantage → prefer ${pick}.`,
          "Reduces interview validation time because impact is measurable."
        ].join("\n");
      case "Ownership & Leadership":
        return [
          `${strength} advantage → prefer ${pick}.`,
          "Higher confidence they can drive outcomes independently."
        ].join("\n");
      case "Clarity & Structure":
        return [
          `${strength} advantage → prefer ${pick}.`,
          "Fewer interpretation errors; faster recruiter screening."
        ].join("\n");
      case "Risk Signals":
        return [
          `${strength} edge → prefer ${pick}.`,
          "Fewer unresolved red flags that can derail final decision."
        ].join("\n");
      default:
        return [`Prefer ${pick}.`, "This dimension shifts hiring confidence."].join("\n");
    }
  }

  if (lens === "RFP") {
    return `${strength} advantage → pick ${pick}; reduces delivery and governance risk.`;
  }

  return `${strength} advantage → pick ${pick}; increases buyer confidence and conversion likelihood.`;
}

function lensTieBreakers(lens: DecisionLens) {
  if (lens === "HIRING") {
    return { first: "Clarity & Structure", second: "Risk Signals" };
  }
  if (lens === "RFP") {
    return { first: "Commercial Clarity", second: "Risk & Compliance" };
  }
  return { first: "Narrative Flow", second: "Proof & Credibility" };
}

function docClarityScore(doc: StrictDocumentInput, lens: DecisionLens) {
  const text = tokens(doc.normalizedText);
  const structureHints =
    lens === "HIRING"
      ? ["experience", "education", "skills", "projects", "summary"]
      : lens === "RFP"
        ? ["scope", "requirements", "deliverables", "timeline", "pricing", "assumptions"]
        : ["agenda", "overview", "problem", "solution", "proof", "next steps"];

  const hits = countHits(text, structureHints);
  const lengthPenalty = text.length > 30000 ? 1 : 0;
  return clampInt(2 + hits - lengthPenalty, 1, 5);
}

function docRiskHygieneScore(doc: StrictDocumentInput, lens: DecisionLens) {
  const text = tokens(doc.normalizedText);
  const redFlags =
    lens === "HIRING"
      ? ["gap", "inconsistent", "contract only", "freelance"]
      : lens === "RFP"
        ? ["tbd", "assumption", "depends on", "out of scope"]
        : ["guarantee", "best in class", "world class", "no risk"];

  const redHits = countHits(text, redFlags);
  const hasNumbers = /(\d+%|\b\d+\b|\$|€|£)/.test(text);
  let score = 4 - Math.min(3, redHits);
  if (!hasNumbers) score -= 1;
  return clampInt(score, 1, 5);
}

function winnerForScores(params: {
  aScore: number;
  bScore: number;
  aEvidence: string[];
  bEvidence: string[];
  tieBreaker: "A" | "B";
}) {
  const { aScore, bScore, aEvidence, bEvidence, tieBreaker } = params;
  if (aScore !== bScore) return aScore > bScore ? "A" : "B";
  const aQ = evidenceQuality(aEvidence);
  const bQ = evidenceQuality(bEvidence);
  if (aQ !== bQ) return aQ > bQ ? "A" : "B";
  return tieBreaker; // ties forbidden -> deterministic break
}

function ensureForcedDifferentiation(params: {
  lens: DecisionLens;
  dimensionResults: {
    dimension: string;
    aEvidence: string[];
    bEvidence: string[];
    aScore: number;
    bScore: number;
    winner: "A" | "B";
  }[];
  tieBreaker: "A" | "B";
}) {
  const { lens, dimensionResults, tieBreaker } = params;
  const diffCount = () => dimensionResults.filter((row) => row.aScore !== row.bScore).length;

  const preferred = [lensTieBreakers(lens).first, lensTieBreakers(lens).second];
  const ordered = [...preferred, ...dimensionResults.map((row) => row.dimension)];

  for (const dim of ordered) {
    if (diffCount() >= 2) break;
    const row = dimensionResults.find((item) => item.dimension === dim);
    if (!row) continue;
    if (row.aScore !== row.bScore) continue;

    row.winner = winnerForScores({
      aScore: row.aScore,
      bScore: row.bScore,
      aEvidence: row.aEvidence,
      bEvidence: row.bEvidence,
      tieBreaker
    });

    if (row.winner === "A") row.aScore = clampInt(row.aScore + 1, 1, 5);
    else row.bScore = clampInt(row.bScore + 1, 1, 5);
  }

  if (diffCount() < 2) {
    for (const row of dimensionResults) {
      if (diffCount() >= 2) break;
      if (row.aScore !== row.bScore) continue;
      if (row.winner === "A" && row.bScore > 1) row.bScore -= 1;
      if (row.winner === "B" && row.aScore > 1) row.aScore -= 1;
    }
  }
}

export type ExcelModel = {
  lens: DecisionLens;
  docA: StrictDocumentInput;
  docB: StrictDocumentInput;
  executiveScorecard: (string | number)[][];
  sideBySide: (string | number)[][];
  improvementPlan: (string | number)[][];
  riskAnalysis: (string | number)[][];
  overall: { winner: "A" | "B"; recommendation: string };
};

export type SingleDocumentScore = {
  lens: DecisionLens;
  doc: StrictDocumentInput;
  total: number;
  clarity: number; // 1-5
  riskHygiene: number; // 1-5 (higher is safer)
  dimensions: {
    dimension: string;
    score: number; // 1-5
    evidence: string[];
    evidenceSnippet: string;
  }[];
};

export function scoreSingleDocument(params: {
  lens: DecisionLens;
  doc: StrictDocumentInput;
}): SingleDocumentScore {
  const { lens, doc } = params;
  const dimensions = LENS_DIMENSIONS[lens];
  const lines = extractCandidateLines(doc);
  const clarity = docClarityScore(doc, lens);
  const riskHygiene = docRiskHygieneScore(doc, lens);

  const dimensionResults = dimensions.map((dimension) => {
    const keywords = dimensionKeywords(lens, dimension);
    const evidence = pickEvidence(lines, keywords).map((line) =>
      line === "No concrete evidence found."
        ? "Missing: no scoped proof provided."
        : line
    );
    const score = scoreFromEvidence(dimension, evidence);
    return {
      dimension,
      score,
      evidence,
      evidenceSnippet: evidenceSnippet(evidence)
    };
  });

  const total = dimensionResults.reduce((sum, row) => sum + row.score, 0);

  return {
    lens,
    doc,
    total,
    clarity,
    riskHygiene,
    dimensions: dimensionResults
  };
}

export function buildExcelModel(params: {
  lens: DecisionLens;
  docA: StrictDocumentInput;
  docB: StrictDocumentInput;
}): ExcelModel {
  const { lens, docA, docB } = params;
  const dimensions = LENS_DIMENSIONS[lens];
  const riskTypes = LENS_RISKS[lens];

  const aLines = extractCandidateLines(docA);
  const bLines = extractCandidateLines(docB);
  const clarityA = docClarityScore(docA, lens);
  const clarityB = docClarityScore(docB, lens);
  const riskA = docRiskHygieneScore(docA, lens);
  const riskB = docRiskHygieneScore(docB, lens);

  const tieBreaker: "A" | "B" =
    clarityA !== clarityB
      ? clarityA > clarityB
        ? "A"
        : "B"
      : riskA !== riskB
        ? riskA > riskB
          ? "A"
          : "B"
        : "A";

  const dimensionResults = dimensions.map((dimension) => {
    const keywords = dimensionKeywords(lens, dimension);
    const aEvidence = pickEvidence(aLines, keywords).map((line) =>
      line === "No concrete evidence found."
        ? "Missing: no scoped proof provided."
        : line
    );
    const bEvidence = pickEvidence(bLines, keywords).map((line) =>
      line === "No concrete evidence found."
        ? "Missing: no scoped proof provided."
        : line
    );
    const aScore = scoreFromEvidence(dimension, aEvidence);
    const bScore = scoreFromEvidence(dimension, bEvidence);
    const win = winnerForScores({ aScore, bScore, aEvidence, bEvidence, tieBreaker });
    return { dimension, aEvidence, bEvidence, aScore, bScore, winner: win };
  });

  ensureForcedDifferentiation({ lens, dimensionResults, tieBreaker });

  const totalA = dimensionResults.reduce((sum, row) => sum + row.aScore, 0);
  const totalB = dimensionResults.reduce((sum, row) => sum + row.bScore, 0);
  const overallWinner: "A" | "B" =
    totalA !== totalB ? (totalA > totalB ? "A" : "B") : tieBreaker;

  const executiveScorecard: (string | number)[][] = [
    [
      "Decision Dimension",
      "Document A Score (1–5)",
      "Document B Score (1–5)",
      "Winner (A / B)",
      "Why This Matters"
    ]
  ];

  for (const row of dimensionResults) {
    const why = dimensionWhy({
      lens,
      dimension: row.dimension,
      aScore: row.aScore,
      bScore: row.bScore,
      winner: row.winner,
      aEvidence: row.aEvidence,
      bEvidence: row.bEvidence
    });
    executiveScorecard.push([
      row.dimension,
      row.aScore,
      row.bScore,
      row.winner,
      why
    ]);
  }

  const overallRecommendation =
    overallWinner === "A"
      ? `Select Document A (${docA.filename})`
      : `Select Document B (${docB.filename})`;

  executiveScorecard.push([
    "Overall Recommendation",
    clampInt(totalA / dimensions.length, 1, 5),
    clampInt(totalB / dimensions.length, 1, 5),
    overallWinner,
    `Recommendation: ${overallRecommendation}.`
  ]);

  const sideBySide: (string | number)[][] = [
    [
      "Dimension",
      "Document A Evidence",
      "Document B Evidence",
      "Key Difference",
      "Which Is Stronger",
      "Decision Impact"
    ]
  ];

  for (const row of dimensionResults) {
    const aEvidenceText = row.aEvidence.map((item) => `- ${item}`).join("\n");
    const bEvidenceText = row.bEvidence.map((item) => `- ${item}`).join("\n");

    const winnerEvidence = row.winner === "A" ? row.aEvidence : row.bEvidence;
    const loserEvidence = row.winner === "A" ? row.bEvidence : row.aEvidence;
    const w = evidenceSnippet(winnerEvidence);
    const l = evidenceSnippet(loserEvidence);
    const gap = Math.abs(row.aScore - row.bScore);
    const keyDiff = `Winner shows “${w}” vs loser “${l}”.`;
    const impact = dimensionDecisionImpact({
      lens,
      dimension: row.dimension,
      winner: row.winner,
      gap
    });
    sideBySide.push([
      row.dimension,
      aEvidenceText || "- Missing: no scoped proof provided.",
      bEvidenceText || "- Missing: no scoped proof provided.",
      keyDiff,
      row.winner,
      impact
    ]);
  }

  const losingDoc = overallWinner === "A" ? docB : docA;
  const winningDoc = overallWinner === "A" ? docA : docB;

  const improvementPlan: (string | number)[][] = [
    ["Weak Area", "Exact Fix Required", "Example Rewrite or Structure", "Priority (High / Medium / Low)", "Impact on Decision"]
  ];

  const deltas = dimensionResults
    .map((row) => {
      const loserScore = overallWinner === "A" ? row.bScore : row.aScore;
      const winnerScore = overallWinner === "A" ? row.aScore : row.bScore;
      return { ...row, loserScore, winnerScore, gap: winnerScore - loserScore };
    })
    .filter((row) => row.gap > 0)
    .sort((a, b) => b.gap - a.gap);

  const makeExample = (dimension: string) => {
    if (lens === "HIRING") {
      if (dimension === "Evidence & Metrics") {
        return `Example bullet: “Owned X; reduced Y by Z% (measured over N weeks), using KPI dashboard evidence.”`;
      }
      if (dimension === "Scope & Seniority") {
        return `Example bullet: “Led N engineers; delivered X; scope: Y services; impact: Z metric.”`;
      }
      if (dimension === "Clarity & Structure") {
        return `Structure: Summary (3 lines) → Skills (grouped) → Experience (role → impact bullets) → Education/Certs.`;
      }
      if (dimension === "Risk Signals") {
        return `Add clarifier: “Gap/transition explanation: <1 line>. References available.”`;
      }
      return `Rewrite template: “Did X → achieved Y (metric) → in Z context (scope).”`;
    }
    if (lens === "RFP") {
      if (dimension === "Requirement Coverage") {
        return `Matrix: Requirement | Response | Evidence section/page | Status (Full/Partial/Gap).`;
      }
      if (dimension === "Delivery & Execution Plan") {
        return `Plan table: Phase | Timeline | Deliverables | Owners | Dependencies | Acceptance criteria.`;
      }
      if (dimension === "Commercial Clarity") {
        return `Pricing table: Line item | Unit | Qty | Price | Assumptions | Term | Renewal.`;
      }
      return `Evidence block: Customer | Scope | Metric | Timeframe | Reference section.`;
    }
    // SALES
    if (dimension === "Call to Action Strength") {
      return `CTA copy: “Next step: 30‑min working session this week. Goal: validate X. Reply with 2 times.”`;
    }
    if (dimension === "Proof & Credibility") {
      return `Proof block: Customer | Baseline | Change | Metric | Timeframe | Source.`;
    }
    if (dimension === "Differentiation") {
      return `Differentiation table: Feature | Us | Alternative | Why it matters | Proof.`;
    }
    return `Narrative: Problem → Cost of inaction → Solution → Proof → CTA.`;
  };

  const addImprovement = (weakArea: string, priority: "High" | "Medium" | "Low") => {
    const exactFix =
      lens === "HIRING"
        ? `For ${weakArea}, add 2 bullets with scope + metric + ownership; remove vague claims from ${losingDoc.filename}.`
        : lens === "RFP"
          ? `For ${weakArea}, add traceable evidence (matrix/table + referenced sections) and remove unprovable promises.`
          : `For ${weakArea}, replace claims with proof (metric + customer + timeframe) and tighten the CTA.`;

    improvementPlan.push([
      weakArea,
      exactFix,
      makeExample(weakArea),
      priority,
      `Closes the gap vs ${winningDoc.filename} and makes ${losingDoc.filename} defensible.`
    ]);
  };

  const firstWeak = deltas[0]?.dimension ?? lensTieBreakers(lens).first;
  const secondWeak = deltas[1]?.dimension ?? lensTieBreakers(lens).second;
  addImprovement(firstWeak, "High");
  addImprovement(secondWeak, "Medium");

  const riskAnalysis: (string | number)[][] = [
    ["Risk Type", "Observed Signal", "Why It Matters", "Risk Level (High / Medium / Low)", "Recommendation"]
  ];

  const combinedText = tokens(`${docA.normalizedText}\n${docB.normalizedText}`);
  const missingNumbers = !/(\d+%|\b\d+\b|\$|€|£)/.test(combinedText);
  let hasMediumOrHigh = false;

  for (const risk of riskTypes) {
    let observed = "Evidence density is thin; this risk must be actively cleared.";
    let level: "High" | "Medium" | "Low" = "Low";
    let recommendation = "Add explicit proof and tighter structure before leadership review.";

    if (lens === "HIRING") {
      if (risk === "Missing metrics" && missingNumbers) {
        observed = "Limited quantified outcomes across both documents.";
        level = "High";
        recommendation = "Require quantified impact bullets before final decision.";
      }
      if (risk === "Inconsistency" && /(\b201\d\b|\b202\d\b).*(\b201\d\b|\b202\d\b)/.test(combinedText)) {
        observed = "Dates are present; verify chronology and overlaps.";
        level = "Medium";
        recommendation = "Validate timeline consistency; request clarification for overlaps.";
      }
    }

    if (lens === "RFP") {
      if (risk === "Commercial opacity" && !combinedText.includes("pricing") && !combinedText.includes("cost")) {
        observed = "Pricing/terms signals are weak or missing.";
        level = "High";
        recommendation = "Demand a clear commercial schedule (pricing, terms, assumptions).";
      }
      if (risk === "Requirement gaps" && !combinedText.includes("requirements")) {
        observed = "No explicit requirements traceability signals detected.";
        level = "High";
        recommendation = "Require a requirements coverage matrix.";
      }
    }

    if (lens === "SALES") {
      if (risk === "Missing CTA" && !combinedText.includes("next steps") && !combinedText.includes("contact")) {
        observed = "No explicit next steps or CTA language detected.";
        level = "High";
        recommendation = "Add an explicit CTA (meeting request, demo, trial) with a concrete next action.";
      }
      if (risk === "Unsupported claims" && missingNumbers) {
        observed = "Claims appear without quantified proof points.";
        level = "High";
        recommendation = "Require proof (case study + metrics) for top 3 claims.";
      }
    }

    riskAnalysis.push([
      risk,
      observed,
      "If unaddressed, this can reverse the decision under scrutiny.",
      level,
      recommendation
    ]);

    if (level !== "Low") {
      hasMediumOrHigh = true;
    }
  }

  if (!hasMediumOrHigh) {
    riskAnalysis.push([
      riskTypes[0],
      "Proof is insufficient to eliminate this risk with confidence.",
      "A decision without defensible evidence will be challenged and may be reversed.",
      "Medium",
      "Add lens-specific proof and structure to neutralize this risk before deciding."
    ]);
  }

  return {
    lens,
    docA,
    docB,
    executiveScorecard,
    sideBySide,
    improvementPlan,
    riskAnalysis,
    overall: { winner: overallWinner, recommendation: overallRecommendation }
  };
}
