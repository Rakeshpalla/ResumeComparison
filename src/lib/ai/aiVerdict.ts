import { callGeminiJson } from "./geminiClient";
import type { Verdict, VerdictMetric, ComparisonRow } from "../verdict";
import type { DecisionSummary } from "../decisionEngine";

type DocumentInfo = { id: string; filename: string };

type AiVerdictResult = {
  metrics: {
    strategicStrength: { score: number; detail: string };
    credibility: { score: number; detail: string };
    senioritySignal: { score: number; detail: string };
    riskLevel: { score: number; detail: string };
  };
  recommendation: {
    title: string;
    detail: string;
    topDocumentId: string;
    topDocumentName: string;
  };
  documentScores: {
    id: string;
    filename: string;
    score: number;
    completeness: number;
    numericPerformance: number;
    keyCoverage: number;
    strengths: string[];
    weaknesses: string[];
  }[];
  decisionOverride: {
    winnerId: string;
    winnerName: string;
    verdict: string;
    justification: string;
    confidence: number;
  };
};

function buildPrompt(documents: DocumentInfo[], rows: ComparisonRow[]): string {
  const docList = documents.map((d) => `- id: "${d.id}", name: "${d.filename}"`).join("\n");

  // Build a readable comparison table
  const table = rows
    .slice(0, 60) // cap at 60 attributes to stay within token limits
    .map((row) => {
      const vals = documents.map((d) => `${d.filename}: ${row.values[d.id] || "(missing)"}`).join(" | ");
      return `  ${row.displayName}: ${vals}`;
    })
    .join("\n");

  return `You are an expert procurement analyst and technical evaluator. Analyze these documents and produce a structured comparison verdict.

DOCUMENTS:
${docList}

ATTRIBUTE COMPARISON TABLE:
${table}

Return a JSON object (raw JSON, no markdown):
{
  "metrics": {
    "strategicStrength": {
      "score": <0-100, strength of the top document based on coverage and attribute wins>,
      "detail": "<1-2 sentence explanation of what drives this score>"
    },
    "credibility": {
      "score": <0-100, data quality — completeness, consistency, specificity>,
      "detail": "<explanation>"
    },
    "senioritySignal": {
      "score": <0-100, presence of enterprise signals: SLA, warranty, compliance, integrations>,
      "detail": "<explanation>"
    },
    "riskLevel": {
      "score": <0-100, lower is better — high score = missing data, inconsistencies, vague claims>,
      "detail": "<explanation>"
    }
  },
  "recommendation": {
    "title": "<Recommend: <filename> OR Edge: <filename> OR No clear winner>",
    "detail": "<3-4 sentence explanation: what makes the top document win, key differentiators, and any caveats the decision-maker should know>",
    "topDocumentId": "<id of recommended document>",
    "topDocumentName": "<filename of recommended document>"
  },
  "documentScores": [
    {
      "id": "<document id>",
      "filename": "<filename>",
      "score": <0-100 overall score>,
      "completeness": <0-100, percentage of attributes filled>,
      "numericPerformance": <0-100, how well numeric attributes compare>,
      "keyCoverage": <0-100, coverage of key decision attributes>,
      "strengths": ["<specific strength with attribute name>"],
      "weaknesses": ["<specific weakness with attribute name>"]
    }
  ],
  "decisionOverride": {
    "winnerId": "<id>",
    "winnerName": "<filename>",
    "verdict": "<Recommend | Slight Edge | Tie>",
    "justification": "<2-3 sentences: the decisive factors, named specifically>",
    "confidence": <0-100>
  }
}

Rules:
- Be specific: reference actual attribute names and values from the table
- "riskLevel" score: lower = better (less risky decision)
- If data is sparse or documents are very similar, reflect that honestly in confidence and metric scores
- "strengths" and "weaknesses" should reference specific attributes, not generic statements
- Sort documentScores from highest score to lowest`;
}

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(Number(v) || 0)));
}

export async function aiEnhanceVerdict(
  documents: DocumentInfo[],
  rows: ComparisonRow[],
  baseVerdict: Verdict,
  baseDecision: DecisionSummary
): Promise<{ verdict: Verdict; decision: DecisionSummary }> {
  const raw = await callGeminiJson<AiVerdictResult>(buildPrompt(documents, rows));

  // If AI fails for any reason, return the base rule-based result unchanged
  if (!raw || !raw.metrics || !raw.recommendation) {
    return { verdict: baseVerdict, decision: baseDecision };
  }

  // Merge AI insights into the existing verdict shape
  const metrics: VerdictMetric[] = [
    {
      key: "strategicStrength",
      label: "Strategic Strength",
      score: clamp(raw.metrics.strategicStrength?.score ?? baseVerdict.metrics[0].score),
      detail: raw.metrics.strategicStrength?.detail || baseVerdict.metrics[0].detail
    },
    {
      key: "credibility",
      label: "Credibility",
      score: clamp(raw.metrics.credibility?.score ?? baseVerdict.metrics[1].score),
      detail: raw.metrics.credibility?.detail || baseVerdict.metrics[1].detail
    },
    {
      key: "senioritySignal",
      label: "Seniority Signal",
      score: clamp(raw.metrics.senioritySignal?.score ?? baseVerdict.metrics[2].score),
      detail: raw.metrics.senioritySignal?.detail || baseVerdict.metrics[2].detail
    },
    {
      key: "riskLevel",
      label: "Risk Level",
      score: clamp(raw.metrics.riskLevel?.score ?? baseVerdict.metrics[3].score),
      detail: raw.metrics.riskLevel?.detail || baseVerdict.metrics[3].detail
    }
  ];

  // Validate topDocumentId exists in our documents
  const validDocIds = new Set(documents.map((d) => d.id));
  const topId = validDocIds.has(raw.recommendation.topDocumentId)
    ? raw.recommendation.topDocumentId
    : baseVerdict.recommendation.topDocumentId;
  const topName = topId
    ? (documents.find((d) => d.id === topId)?.filename ?? baseVerdict.recommendation.topDocumentName)
    : baseVerdict.recommendation.topDocumentName;

  const enhancedVerdict: Verdict = {
    metrics,
    recommendation: {
      title: raw.recommendation.title || baseVerdict.recommendation.title,
      detail: raw.recommendation.detail || baseVerdict.recommendation.detail,
      topDocumentId: topId,
      topDocumentName: topName
    },
    documentScores: (raw.documentScores ?? [])
      .filter((ds) => validDocIds.has(ds.id))
      .map((ds) => ({
        id: ds.id,
        filename: ds.filename,
        score: clamp(ds.score),
        completeness: clamp(ds.completeness),
        numericPerformance: clamp(ds.numericPerformance),
        keyCoverage: clamp(ds.keyCoverage)
      }))
  };

  // Fall back to base document scores if AI didn't return valid ones
  if (enhancedVerdict.documentScores.length === 0) {
    enhancedVerdict.documentScores = baseVerdict.documentScores;
  }

  // Enhance the decision summary's overall verdict with AI justification
  const enhancedDecision: DecisionSummary = {
    ...baseDecision,
    overall: raw.decisionOverride && validDocIds.has(raw.decisionOverride.winnerId)
      ? {
          winnerId: raw.decisionOverride.winnerId,
          winnerName: raw.decisionOverride.winnerName,
          verdict: raw.decisionOverride.verdict || baseDecision.overall.verdict,
          justification: raw.decisionOverride.justification || baseDecision.overall.justification,
          confidence: clamp(raw.decisionOverride.confidence)
        }
      : baseDecision.overall
  };

  return { verdict: enhancedVerdict, decision: enhancedDecision };
}
