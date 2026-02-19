/**
 * Trust Fix regression tests.
 * Run with: npx jest tests/trust-fix-regression.test.ts
 * (Requires Jest + ts-jest or Next.js test setup.)
 */

import {
  rankDocuments,
  rankDocumentsOriginal,
  shouldShowCloseMatchInsights,
  type RankedDocument
} from "../src/lib/multiDocRanking";
import type { StrictDocumentInput } from "../src/lib/strictDecisionComparison";

function makeDoc(id: string, filename: string, text: string): StrictDocumentInput {
  return {
    id,
    filename,
    normalizedText: text,
    attributes: []
  };
}

describe("Trust Fix - Regression Tests", () => {
  test("Original ranking still works when enhanced disabled", () => {
    const docs: StrictDocumentInput[] = [
      makeDoc("a", "A.pdf", "short"),
      makeDoc("b", "B.pdf", "short"),
      makeDoc("c", "C.pdf", "short")
    ];
    const result = rankDocumentsOriginal({
      lens: "HIRING",
      docs,
      contextText: ""
    });
    expect(result.ranked).toBeDefined();
    expect(Array.isArray(result.ranked)).toBe(true);
    expect(result.ranked.length).toBe(3);
    const totals = result.ranked.map((r) => r.total);
    expect(totals).toEqual([...totals].sort((a, b) => b - a));
  });

  test("Enhanced ranking handles missing tie-breaker data gracefully", () => {
    const docs: StrictDocumentInput[] = [
      makeDoc("a", "A.pdf", "resume content"),
      makeDoc("b", "B.pdf", "resume content")
    ];
    expect(() => {
      rankDocuments(
        { lens: "HIRING", docs, contextText: "" },
        { useTieBreakers: true }
      );
    }).not.toThrow();
  });

  test("Close match insights only show when appropriate", () => {
    const closeScores: RankedDocument[] = [
      {
        id: "1",
        filename: "A",
        rank: 1,
        total: 28,
        clarity: 4,
        riskHygiene: 4,
        contextFitPercent: 0,
        matchedKeywords: [],
        missingKeywords: [],
        dimensions: [],
        risks: [],
        interviewKit: { verifyQuestions: [], proofRequests: [] },
        enhanced: {
          tieBreakers: {
            criticalSkillMatchPercentage: 80,
            experienceYears: 5,
            quantifiedAchievementsCount: 3,
            educationLevel: 4,
            careerProgressionScore: 2
          },
          confidenceMetrics: { dataQualityScore: 80, matchCertainty: "HIGH" },
          differentiationFactors: []
        }
      },
      {
        id: "2",
        filename: "B",
        rank: 2,
        total: 27,
        clarity: 4,
        riskHygiene: 4,
        contextFitPercent: 0,
        matchedKeywords: [],
        missingKeywords: [],
        dimensions: [],
        risks: [],
        interviewKit: { verifyQuestions: [], proofRequests: [] },
        enhanced: {
          tieBreakers: { criticalSkillMatchPercentage: null, experienceYears: 0, quantifiedAchievementsCount: 0, educationLevel: 0, careerProgressionScore: 0 },
          confidenceMetrics: { dataQualityScore: 0, matchCertainty: "LOW" },
          differentiationFactors: []
        }
      },
      {
        id: "3",
        filename: "C",
        rank: 3,
        total: 26,
        clarity: 4,
        riskHygiene: 4,
        contextFitPercent: 0,
        matchedKeywords: [],
        missingKeywords: [],
        dimensions: [],
        risks: [],
        interviewKit: { verifyQuestions: [], proofRequests: [] },
        enhanced: {
          tieBreakers: { criticalSkillMatchPercentage: null, experienceYears: 0, quantifiedAchievementsCount: 0, educationLevel: 0, careerProgressionScore: 0 },
          confidenceMetrics: { dataQualityScore: 0, matchCertainty: "LOW" },
          differentiationFactors: []
        }
      }
    ];

    const spreadScores: RankedDocument[] = [
      { ...closeScores[0], total: 30, rank: 1, enhanced: undefined },
      { ...closeScores[1], total: 20, rank: 2, enhanced: undefined },
      { ...closeScores[2], total: 10, rank: 3, enhanced: undefined }
    ];

    expect(shouldShowCloseMatchInsights(closeScores)).toBe(true);
    expect(shouldShowCloseMatchInsights(spreadScores)).toBe(false);
  });
});
