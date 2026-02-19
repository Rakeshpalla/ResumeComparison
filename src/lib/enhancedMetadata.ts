/**
 * Enhanced metadata for candidates: tie-breakers, confidence, differentiation.
 * Used only when scores are close; does not change existing scoring.
 */

export type EnhancedMetadata = {
  tieBreakers: {
    criticalSkillMatchPercentage: number | null;
    experienceYears: number;
    quantifiedAchievementsCount: number;
    educationLevel: number;
    careerProgressionScore: number;
  };
  confidenceMetrics: {
    dataQualityScore: number;
    matchCertainty: "LOW" | "MEDIUM" | "HIGH";
  };
  differentiationFactors: string[];
};

const EMPTY_ENHANCED: EnhancedMetadata = {
  tieBreakers: {
    criticalSkillMatchPercentage: null,
    experienceYears: 0,
    quantifiedAchievementsCount: 0,
    educationLevel: 0,
    careerProgressionScore: 0
  },
  confidenceMetrics: { dataQualityScore: 0, matchCertainty: "LOW" },
  differentiationFactors: []
};

function extractMustHaveSkills(jobDescription: string): string[] {
  const patterns = [
    /required\s+skills?:?\s*([^\n]+)/gi,
    /must\s+have:?\s*([^\n]+)/gi,
    /essential:?\s*([^\n]+)/gi,
    /requirements?:?\s*([^\n]+)/gi
  ];
  const skills: string[] = [];
  for (const pattern of patterns) {
    const matches = jobDescription.matchAll(pattern);
    for (const match of matches) {
      const extracted = match[1];
      if (extracted) {
        const parts = extracted.split(/[:,;]/);
        const afterColon = parts[parts.length - 1]?.trim() ?? "";
        skills.push(
          ...afterColon
            .split(/[,;]|\band\b/)
            .map((s) => s.trim())
            .filter((s) => s.length > 1)
        );
      }
    }
  }
  return [...new Set(skills)].slice(0, 20);
}

function extractCriticalSkillMatch(resumeContent: string, jobDescription: string): number | null {
  const criticalKeywords = extractMustHaveSkills(jobDescription);
  if (criticalKeywords.length === 0) return null;
  const resumeText = resumeContent.toLowerCase();
  const matched = criticalKeywords.filter((skill) =>
    resumeText.includes(skill.toLowerCase().trim())
  );
  return Math.round((matched.length / criticalKeywords.length) * 100);
}

function extractTotalExperience(resumeContent: string): number {
  const text = resumeContent;
  const yearRanges = text.match(/(\d{4})\s*[-–—]\s*(\d{4}|present|current|now)/gi);
  if (!yearRanges || yearRanges.length === 0) return 0;
  let totalMonths = 0;
  const currentYear = new Date().getFullYear();
  for (const range of yearRanges) {
    const parts = range.match(/(\d{4})/g);
    if (parts && parts.length >= 1) {
      const startYear = parseInt(parts[0], 10);
      const endYear = parts[1] ? parseInt(parts[1], 10) : currentYear;
      if (!Number.isNaN(startYear) && !Number.isNaN(endYear)) {
        totalMonths += (endYear - startYear) * 12;
      }
    }
  }
  return Math.round((totalMonths / 12) * 10) / 10;
}

function countQuantifiableResults(resumeContent: string): number {
  const patterns = [
    /\d+%/g,
    /\$[\d,]+/g,
    /increased.*?by.*?\d+/gi,
    /reduced.*?by.*?\d+/gi,
    /grew.*?by.*?\d+/gi,
    /saved.*?\$[\d,]+/gi,
    /\d+x\s*(improvement|growth|increase)/gi
  ];
  let count = 0;
  for (const pattern of patterns) {
    const matches = resumeContent.match(pattern);
    if (matches) count += matches.length;
  }
  return count;
}

function scoreEducationLevel(resumeContent: string): number {
  const text = resumeContent.toLowerCase();
  if (text.includes("phd") || text.includes("doctorate")) return 5;
  if (text.includes("master") || text.includes("mba") || text.includes("m.s") || text.includes("ms ")) return 4;
  if (text.includes("bachelor") || text.includes("b.s") || text.includes("b.a") || text.includes("bs ") || text.includes("ba ")) return 3;
  if (text.includes("associate")) return 2;
  if (text.includes("high school") || text.includes("diploma")) return 1;
  return 0;
}

function analyzeCareerGrowth(resumeContent: string): number {
  const progressionKeywords = [
    "promoted",
    "advanced to",
    "senior",
    "lead",
    "principal",
    "manager",
    "director",
    "vp",
    "vice president",
    "chief"
  ];
  const text = resumeContent.toLowerCase();
  let score = 0;
  for (const keyword of progressionKeywords) {
    if (text.includes(keyword)) score += 1;
  }
  return Math.min(score, 10);
}

function assessResumeCompleteness(resumeContent: string): number {
  const sections = [
    "experience",
    "education",
    "skills",
    "certifications",
    "projects",
    "achievements"
  ];
  const text = resumeContent.toLowerCase();
  const present = sections.filter((section) => text.includes(section)).length;
  return Math.round((present / sections.length) * 100);
}

function calculateMatchCertainty(
  resumeContent: string,
  jobDescription: string
): "LOW" | "MEDIUM" | "HIGH" {
  const jdLength = jobDescription.length;
  const resumeLength = resumeContent.length;
  if (jdLength < 200 || resumeLength < 500) return "LOW";
  if (jdLength < 500 || resumeLength < 1000) return "MEDIUM";
  return "HIGH";
}

function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .split(/\W+/)
    .filter((word) => word.length > 4);
}

function identifyUniqueStrengths(resumeContent: string, jobDescription: string): string[] {
  const strengths: string[] = [];
  const resumeKeywords = extractKeywords(resumeContent);
  const jdKeywords = extractKeywords(jobDescription);
  const unique = resumeKeywords.filter((kw) => !jdKeywords.includes(kw));
  if (unique.includes("leadership")) strengths.push("Leadership experience");
  if (unique.includes("startup")) strengths.push("Startup experience");
  if (unique.includes("enterprise")) strengths.push("Enterprise background");
  if (unique.includes("international") || unique.includes("global")) strengths.push("International experience");
  return strengths.slice(0, 3);
}

/**
 * Compute enhanced metadata for a single resume + JD. Fails gracefully (returns empty structure).
 */
export function calculateEnhancedMetadata(
  resumeContent: string,
  jobDescription: string
): EnhancedMetadata {
  try {
    const jd = jobDescription?.trim() ?? "";
    const content = resumeContent?.trim() ?? "";
    return {
      tieBreakers: {
        criticalSkillMatchPercentage: extractCriticalSkillMatch(content, jd),
        experienceYears: extractTotalExperience(content),
        quantifiedAchievementsCount: countQuantifiableResults(content),
        educationLevel: scoreEducationLevel(content),
        careerProgressionScore: analyzeCareerGrowth(content)
      },
      confidenceMetrics: {
        dataQualityScore: assessResumeCompleteness(content),
        matchCertainty: calculateMatchCertainty(content, jd)
      },
      differentiationFactors: identifyUniqueStrengths(content, jd)
    };
  } catch (err) {
    console.error("Enhanced metadata calculation failed:", err);
    return { ...EMPTY_ENHANCED };
  }
}
