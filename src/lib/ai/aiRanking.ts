import { callGeminiJson } from "./geminiClient";
import type { StrictDocumentInput } from "../strictDecisionComparison";
import type { RankedDocument, RecommendationStrength } from "../multiDocRanking";

type AiRankingResult = {
  ranked: RankedDocument[];
  recommendation: {
    strength: RecommendationStrength;
    headline: string;
    subtext: string;
  };
};

const DIMENSIONS = [
  "Role Fit",
  "Scope & Seniority",
  "Evidence & Metrics",
  "Ownership & Leadership",
  "Clarity & Structure",
  "Risk Signals"
] as const;

function buildPrompt(docs: StrictDocumentInput[], contextText: string): string {
  const jdSection = contextText.trim()
    ? `JOB DESCRIPTION / CONTEXT:\n"""\n${contextText.slice(0, 4000)}\n"""\n\n`
    : "No job description provided — evaluate resumes on general quality.\n\n";

  const resumesSections = docs
    .map(
      (doc, i) =>
        `RESUME ${i + 1} (id: "${doc.id}", filename: "${doc.filename}"):\n"""\n${doc.normalizedText.slice(0, 15000)}\n"""`
    )
    .join("\n\n");

  return `You are an expert technical recruiter and hiring manager. Analyze the following resumes and rank the candidates.

${jdSection}${resumesSections}

Return a JSON object with exactly this shape (no markdown, raw JSON only):
{
  "ranked": [
    {
      "id": "<document id>",
      "filename": "<filename>",
      "rank": <1-based rank, 1 = best>,
      "total": <integer 0-30, sum of 6 dimension scores>,
      "clarity": <integer 1-5>,
      "riskHygiene": <integer 1-5, higher means fewer red flags>,
      "contextFitPercent": <0-100, how well resume matches the JD; 50 if no JD>,
      "matchedKeywords": ["<keyword from JD found in resume>"],
      "missingKeywords": ["<keyword from JD NOT found in resume>"],
      "dimensions": [
        {
          "dimension": "Role Fit",
          "score": <1-5>,
          "evidenceSnippet": "<direct quote or summary from resume supporting this score>",
          "scoreReason": "<one sentence explaining why this score was given>"
        },
        {
          "dimension": "Scope & Seniority",
          "score": <1-5>,
          "evidenceSnippet": "<quote or summary>",
          "scoreReason": "<reason>"
        },
        {
          "dimension": "Evidence & Metrics",
          "score": <1-5>,
          "evidenceSnippet": "<quote or summary>",
          "scoreReason": "<reason>"
        },
        {
          "dimension": "Ownership & Leadership",
          "score": <1-5>,
          "evidenceSnippet": "<quote or summary>",
          "scoreReason": "<reason>"
        },
        {
          "dimension": "Clarity & Structure",
          "score": <1-5>,
          "evidenceSnippet": "<quote or summary>",
          "scoreReason": "<reason>"
        },
        {
          "dimension": "Risk Signals",
          "score": <1-5>,
          "evidenceSnippet": "<quote or summary — note gaps, short stints, vague claims>",
          "scoreReason": "<reason — higher score = safer/fewer red flags>"
        }
      ],
      "risks": [
        {
          "riskType": "<e.g. Employment gap, Vague claims, Role mismatch>",
          "level": "High" | "Medium" | "Low",
          "bullets": ["<specific observation>"]
        }
      ],
      "interviewKit": {
        "verifyQuestions": ["<targeted interview question based on gaps or weak dimensions>"],
        "proofRequests": ["<artifact or proof the interviewer should ask for>"]
      }
    }
  ],
  "recommendation": {
    "strength": "strong" | "moderate" | "weak" | "none",
    "headline": "<one line headline for recruiters>",
    "subtext": "<2-3 sentence explanation of the ranking rationale, what separates the top candidate, and any caveats>"
  }
}

Scoring rules:
- Score 1 = No evidence found, 2 = Weak/vague evidence, 3 = Adequate but unquantified, 4 = Good with some metrics, 5 = Exceptional with quantified proof
- "Risk Signals" dimension: 5 = clean profile, 1 = multiple red flags
- "total" must equal the exact sum of the 6 dimension scores
- "contextFitPercent": if no JD provided, set 50 for all candidates
- Rank candidates from best (1) to worst; if tied on total, use clarity then riskHygiene
- "recommendation.strength": "strong" if top candidate total >= 22 and gap >= 4; "moderate" if total >= 18 and gap >= 3; "weak" if gap <= 2 or total < 18; "none" if top total < 14 or no JD match
- Generate at least 2 verifyQuestions and 2 proofRequests per candidate, targeting their weakest dimensions and missing JD keywords
- Be specific and honest — avoid generic praise; name actual companies, projects, or numbers from the resume when available`;
}

function sanitizeResult(result: AiRankingResult, docs: StrictDocumentInput[]): AiRankingResult {
  const docIds = new Set(docs.map((d) => d.id));

  // Ensure all docs are present, in rank order
  const ranked = result.ranked
    .filter((r) => docIds.has(r.id))
    .map((r, idx) => ({
      ...r,
      rank: idx + 1,
      total: Math.max(0, Math.min(30, Number(r.total) || 0)),
      clarity: Math.max(1, Math.min(5, Number(r.clarity) || 3)),
      riskHygiene: Math.max(1, Math.min(5, Number(r.riskHygiene) || 3)),
      contextFitPercent: Math.max(0, Math.min(100, Number(r.contextFitPercent) || 50)),
      matchedKeywords: Array.isArray(r.matchedKeywords) ? r.matchedKeywords : [],
      missingKeywords: Array.isArray(r.missingKeywords) ? r.missingKeywords : [],
      dimensions: Array.isArray(r.dimensions) ? r.dimensions.map((d) => ({
        dimension: d.dimension || "Unknown",
        score: Math.max(1, Math.min(5, Number(d.score) || 3)),
        evidenceSnippet: d.evidenceSnippet || "",
        scoreReason: d.scoreReason || ""
      })) : [],
      risks: Array.isArray(r.risks) ? r.risks : [],
      interviewKit: {
        verifyQuestions: Array.isArray(r.interviewKit?.verifyQuestions) ? r.interviewKit.verifyQuestions : [],
        proofRequests: Array.isArray(r.interviewKit?.proofRequests) ? r.interviewKit.proofRequests : []
      }
    }));

  // Add any docs missing from AI response (safety net)
  const returnedIds = new Set(ranked.map((r) => r.id));
  for (const doc of docs) {
    if (!returnedIds.has(doc.id)) {
      ranked.push({
        id: doc.id,
        filename: doc.filename,
        rank: ranked.length + 1,
        total: 0,
        clarity: 1,
        riskHygiene: 1,
        contextFitPercent: 0,
        matchedKeywords: [],
        missingKeywords: [],
        dimensions: DIMENSIONS.map((d) => ({ dimension: d, score: 1, evidenceSnippet: "Not analyzed", scoreReason: "Not returned by AI" })),
        risks: [],
        interviewKit: { verifyQuestions: [], proofRequests: [] }
      });
    }
  }

  const validStrengths: RecommendationStrength[] = ["strong", "moderate", "weak", "none"];
  const strength = validStrengths.includes(result.recommendation?.strength)
    ? result.recommendation.strength
    : "weak";

  return {
    ranked,
    recommendation: {
      strength,
      headline: result.recommendation?.headline || "Analysis complete",
      subtext: result.recommendation?.subtext || ""
    }
  };
}

export async function aiRankDocuments(params: {
  docs: StrictDocumentInput[];
  contextText: string;
}): Promise<AiRankingResult | null> {
  const { docs, contextText } = params;
  const prompt = buildPrompt(docs, contextText);

  const raw = await callGeminiJson<AiRankingResult>(prompt, 45_000);
  if (!raw || !Array.isArray(raw.ranked)) return null;

  return sanitizeResult(raw, docs);
}
