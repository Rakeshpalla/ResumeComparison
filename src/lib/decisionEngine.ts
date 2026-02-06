type DocumentInfo = { id: string; filename: string };

export type DecisionComparisonRow = {
  key: string;
  displayName: string;
  values: Record<string, string>;
};

export type DecisionSummary = {
  intent: {
    primary: string;
    confidence: number;
    rationale: string;
  };
  audience: {
    primary: string;
    rationale: string;
  };
  successCriteria: { criterion: string; rationale: string }[];
  sections: DecisionSection[];
  overall: {
    winnerId: string | null;
    winnerName: string | null;
    verdict: string;
    justification: string;
    confidence: number;
  };
  improvements: DecisionImprovement[];
  risks: DecisionRisk[];
  qualityFlags: {
    incomplete: string[];
    lowQuality: string[];
    imbalanced: string[];
  };
};

export type DecisionSection = {
  name: string;
  winnerId: string | null;
  winnerName: string | null;
  summary: string;
  scores: {
    documentId: string;
    documentName: string;
    score: number;
    completeness: number;
    numericPerformance: number;
  }[];
  docSummaries: {
    documentId: string;
    documentName: string;
    summary: string;
  }[];
};

export type DecisionImprovement = {
  documentId: string;
  documentName: string;
  priority: "High" | "Medium" | "Low";
  action: string;
  rationale: string;
  impact: string;
};

export type DecisionRisk = {
  category: string;
  severity: "High" | "Medium" | "Low";
  evidence: string;
  impact: string;
};

const EMPTY_VALUE = new Set([
  "",
  "-",
  "—",
  "n/a",
  "na",
  "not available",
  "unknown",
  "tbd"
]);

const SECTION_RULES: { name: string; keywords: string[] }[] = [
  { name: "Performance", keywords: ["processor", "cpu", "core", "thread", "frequency", "speed"] },
  { name: "Capacity", keywords: ["memory", "ram", "storage", "capacity", "disk"] },
  { name: "Reliability & Support", keywords: ["warranty", "support", "sla", "uptime", "availability"] },
  { name: "Security & Compliance", keywords: ["security", "compliance", "certification", "encryption", "soc", "iso", "gdpr"] },
  { name: "Cost", keywords: ["price", "cost", "license", "subscription", "opex", "capex"] },
  { name: "Dimensions & Portability", keywords: ["weight", "dimension", "height", "width", "depth", "battery"] },
  { name: "Operations", keywords: ["management", "integration", "deployment", "monitoring"] }
];

const INTENT_HINTS: { intent: string; keywords: string[] }[] = [
  { intent: "Sell", keywords: ["price", "cost", "discount", "offer", "sku", "warranty", "buy"] },
  { intent: "Inform", keywords: ["spec", "specification", "datasheet", "overview", "technical"] },
  { intent: "Comply", keywords: ["compliance", "certification", "regulatory", "iso", "soc", "gdpr"] },
  { intent: "Persuade", keywords: ["benefit", "advantage", "why", "value", "roi", "case study"] },
  { intent: "Hire", keywords: ["resume", "experience", "skills", "candidate", "employment"] }
];

const AUDIENCE_HINTS: { audience: string; keywords: string[] }[] = [
  { audience: "Engineering", keywords: ["processor", "cpu", "ram", "storage", "performance", "integration"] },
  { audience: "Procurement", keywords: ["price", "cost", "license", "subscription", "warranty"] },
  { audience: "Compliance", keywords: ["compliance", "certification", "security", "gdpr", "iso"] },
  { audience: "Operations", keywords: ["uptime", "availability", "support", "sla", "management"] },
  { audience: "Executive", keywords: ["roi", "value", "strategy", "impact"] }
];

const SUCCESS_CRITERIA_HINTS: { criterion: string; keywords: string[] }[] = [
  { criterion: "Lower total cost", keywords: ["price", "cost", "opex", "capex"] },
  { criterion: "Performance headroom", keywords: ["processor", "cpu", "frequency", "speed"] },
  { criterion: "Capacity & scalability", keywords: ["storage", "memory", "capacity"] },
  { criterion: "Reliability & support", keywords: ["warranty", "sla", "uptime", "support"] },
  { criterion: "Compliance readiness", keywords: ["compliance", "certification", "security", "gdpr", "iso"] },
  { criterion: "Portability & footprint", keywords: ["weight", "dimension", "battery"] }
];

const LOWER_IS_BETTER_HINTS = ["price", "cost", "weight", "depth", "height", "width", "dimension", "power"];

const HIGHER_IS_BETTER_HINTS = [
  "storage",
  "memory",
  "ram",
  "capacity",
  "battery",
  "processor",
  "cpu",
  "core",
  "thread",
  "frequency",
  "speed",
  "warranty",
  "resolution"
];

type NumericValue = { value: number; unitType: string };

function isEmpty(value: string | undefined) {
  if (!value) return true;
  const trimmed = value.trim().toLowerCase();
  return EMPTY_VALUE.has(trimmed);
}

function detectUnit(value: string): { unitType: string; multiplier: number } | null {
  const lowered = value.toLowerCase();
  if (/\$|usd|inr|eur|gbp/.test(lowered)) return { unitType: "currency", multiplier: 1 };
  if (/tb|terabyte/.test(lowered)) return { unitType: "storage", multiplier: 1024 };
  if (/gb|gigabyte/.test(lowered)) return { unitType: "storage", multiplier: 1 };
  if (/mb|megabyte/.test(lowered)) return { unitType: "storage", multiplier: 1 / 1024 };
  if (/ghz/.test(lowered)) return { unitType: "frequency", multiplier: 1000 };
  if (/mhz/.test(lowered)) return { unitType: "frequency", multiplier: 1 };
  if (/kg/.test(lowered)) return { unitType: "weight", multiplier: 1 };
  if (/\blb|\blbs/.test(lowered)) return { unitType: "weight", multiplier: 0.453592 };
  if (/\bg\b/.test(lowered)) return { unitType: "weight", multiplier: 0.001 };
  if (/mm/.test(lowered)) return { unitType: "length", multiplier: 1 };
  if (/cm/.test(lowered)) return { unitType: "length", multiplier: 10 };
  if (/\bin\b/.test(lowered)) return { unitType: "length", multiplier: 25.4 };
  if (/\bm\b/.test(lowered)) return { unitType: "length", multiplier: 1000 };
  if (/\b(w|watt)\b/.test(lowered)) return { unitType: "power", multiplier: 1 };
  if (/mah/.test(lowered)) return { unitType: "battery", multiplier: 1 };
  if (/year|yr/.test(lowered)) return { unitType: "warranty", multiplier: 12 };
  if (/month|mo/.test(lowered)) return { unitType: "warranty", multiplier: 1 };
  return null;
}

function parseNumeric(value: string): NumericValue | null {
  const matches = value.match(/-?\d+(\.\d+)?/g);
  if (!matches || matches.length !== 1) {
    return null;
  }
  const number = Number(matches[0]);
  if (Number.isNaN(number)) return null;
  const unit = detectUnit(value);
  if (!unit) return null;
  return { value: number * unit.multiplier, unitType: unit.unitType };
}

function scoreDirection(key: string) {
  const normalized = key.toLowerCase();
  if (LOWER_IS_BETTER_HINTS.some((hint) => normalized.includes(hint))) {
    return "lower";
  }
  if (HIGHER_IS_BETTER_HINTS.some((hint) => normalized.includes(hint))) {
    return "higher";
  }
  return "higher";
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function sectionForRow(row: DecisionComparisonRow) {
  const key = `${row.key} ${row.displayName}`.toLowerCase();
  for (const rule of SECTION_RULES) {
    if (rule.keywords.some((keyword) => key.includes(keyword))) {
      return rule.name;
    }
  }
  return "Other";
}

function scoreSignals(text: string, rules: { intent?: string; audience?: string; keywords: string[] }[]) {
  const lowered = text.toLowerCase();
  return rules.map((rule) => ({
    label: rule.intent ?? rule.audience ?? "",
    score: rule.keywords.reduce((sum, keyword) => (lowered.includes(keyword) ? sum + 1 : sum), 0),
    keywords: rule.keywords
  }));
}

function buildSignalRationale(label: string, text: string, keywords: string[]) {
  const matches = keywords.filter((keyword) => text.toLowerCase().includes(keyword));
  if (matches.length === 0) {
    return `No clear signals for ${label.toLowerCase()}.`;
  }
  return `Signals detected: ${matches.slice(0, 4).join(", ")}.`;
}

function collectText(rows: DecisionComparisonRow[]) {
  const parts: string[] = [];
  for (const row of rows) {
    parts.push(row.displayName, row.key);
    for (const value of Object.values(row.values)) {
      if (!isEmpty(value)) {
        parts.push(value);
      }
    }
  }
  return parts.join(" ").slice(0, 4000);
}

function buildSectionSummary(
  sectionName: string,
  rows: DecisionComparisonRow[],
  documents: DocumentInfo[],
  scores: DecisionSection["scores"],
  winnerName: string | null
) {
  const keyRows = rows.filter((row) => {
    const lower = row.key.toLowerCase();
    return LOWER_IS_BETTER_HINTS.some((hint) => lower.includes(hint)) ||
      HIGHER_IS_BETTER_HINTS.some((hint) => lower.includes(hint));
  });

  const missingCounts = documents.map((doc) =>
    rows.filter((row) => isEmpty(row.values[doc.id])).length
  );
  const worstMissing = Math.max(...missingCounts);
  const bestCoverage = Math.min(...missingCounts);

  const coverageNote =
    rows.length > 0
      ? `Coverage variance ${bestCoverage}-${worstMissing} missing attributes.`
      : "No attributes captured in this section.";

  const keySignals = keyRows
    .slice(0, 3)
    .map((row) => row.displayName)
    .join(", ");

  const scoreNote = winnerName
    ? `Winner: ${winnerName}.`
    : "No clear winner.";

  const comparisonNote =
    keySignals.length > 0
      ? `Key signals: ${keySignals}.`
      : "Key signals are limited.";

  return `${sectionName}: ${scoreNote} ${coverageNote} ${comparisonNote}`.trim();
}

function buildDocSummary(rows: DecisionComparisonRow[], documentId: string) {
  const highlights = rows
    .filter((row) => !isEmpty(row.values[documentId]))
    .slice(0, 3)
    .map((row) => `${row.displayName}: ${row.values[documentId]}`);
  if (highlights.length === 0) {
    return "Limited data available.";
  }
  return highlights.join("; ");
}

function priorityForSection(sectionName: string) {
  if (["Cost", "Security & Compliance", "Reliability & Support"].includes(sectionName)) {
    return "High";
  }
  if (["Performance", "Capacity", "Operations"].includes(sectionName)) {
    return "Medium";
  }
  return "Low";
}

function createImprovementImpact(priority: "High" | "Medium" | "Low") {
  if (priority === "High") return "Direct decision blocker if unresolved.";
  if (priority === "Medium") return "Could swing selection in a close comparison.";
  return "Incremental improvement; low decision impact.";
}

export function buildDecisionSummary(
  documents: DocumentInfo[],
  rows: DecisionComparisonRow[]
): DecisionSummary {
  const safeDocuments = documents.length > 0 ? documents : [];
  const safeRows = rows.length > 0 ? rows : [];
  const text = collectText(safeRows);

  const intentScores = scoreSignals(text, INTENT_HINTS.map((hint) => ({ intent: hint.intent, keywords: hint.keywords })));
  const sortedIntents = intentScores.sort((a, b) => b.score - a.score);
  const topIntent = sortedIntents[0];
  const intentTotal = sortedIntents.reduce((sum, item) => sum + item.score, 0) || 1;
  const intentConfidence = Math.round((topIntent.score / intentTotal) * 100);

  const audienceScores = scoreSignals(text, AUDIENCE_HINTS.map((hint) => ({ audience: hint.audience, keywords: hint.keywords })));
  const sortedAudience = audienceScores.sort((a, b) => b.score - a.score);
  const topAudience = sortedAudience[0];

  const successCriteria = SUCCESS_CRITERIA_HINTS.filter((rule) =>
    rule.keywords.some((keyword) => text.toLowerCase().includes(keyword))
  )
    .slice(0, 4)
    .map((rule) => ({
      criterion: rule.criterion,
      rationale: `Signals: ${rule.keywords.filter((keyword) => text.toLowerCase().includes(keyword)).slice(0, 3).join(", ")}.`
    }));

  const sectionMap = new Map<string, DecisionComparisonRow[]>();
  for (const row of safeRows) {
    const section = sectionForRow(row);
    const existing = sectionMap.get(section) || [];
    existing.push(row);
    sectionMap.set(section, existing);
  }

  const sections: DecisionSection[] = [];
  const qualityFlags = {
    incomplete: [] as string[],
    lowQuality: [] as string[],
    imbalanced: [] as string[]
  };

  for (const [sectionName, sectionRows] of sectionMap.entries()) {
    const attributeCount = Math.max(sectionRows.length, 1);
    const scores = safeDocuments.map((doc) => {
      let valueCount = 0;
      let numericScoreSum = 0;
      let numericScoreCount = 0;

      for (const row of sectionRows) {
        const value = row.values[doc.id];
        if (!isEmpty(value)) {
          valueCount += 1;
        }

        const numericEntries = safeDocuments
          .map((target) => {
            const raw = row.values[target.id];
            return raw ? { docId: target.id, numeric: parseNumeric(raw) } : null;
          })
          .filter((entry): entry is { docId: string; numeric: NumericValue | null } => Boolean(entry));

        const comparable = numericEntries.filter((entry) => entry.numeric !== null) as {
          docId: string;
          numeric: NumericValue;
        }[];

        if (comparable.length >= 2) {
          const unitType = comparable[0].numeric.unitType;
          const sameUnit = comparable.filter((entry) => entry.numeric.unitType === unitType);
          if (sameUnit.length >= 2) {
            const values = sameUnit.map((entry) => entry.numeric.value);
            const min = Math.min(...values);
            const max = Math.max(...values);
            const direction = scoreDirection(row.key);
            for (const entry of sameUnit) {
              let normalized = 0.5;
              if (max !== min) {
                normalized =
                  direction === "higher"
                    ? (entry.numeric.value - min) / (max - min)
                    : (max - entry.numeric.value) / (max - min);
              }
              if (entry.docId === doc.id) {
                numericScoreSum += normalized;
                numericScoreCount += 1;
              }
            }
          }
        }
      }

      const completeness = valueCount / attributeCount;
      const numericPerformance =
        numericScoreCount > 0 ? numericScoreSum / numericScoreCount : 0.4;
      const score = clampScore((0.6 * completeness + 0.4 * numericPerformance) * 100);

      return {
        documentId: doc.id,
        documentName: doc.filename,
        score,
        completeness: clampScore(completeness * 100),
        numericPerformance: clampScore(numericPerformance * 100)
      };
    });

    scores.sort((a, b) => b.score - a.score);
    const top = scores[0];
    const runner = scores[1];
    const gap = top && runner ? top.score - runner.score : 0;
    const winner =
      top && runner && gap <= 2 ? null : top ?? null;

    const summary = buildSectionSummary(
      sectionName,
      sectionRows,
      safeDocuments,
      scores,
      winner?.documentName ?? null
    );

    const docSummaries = safeDocuments.map((doc) => ({
      documentId: doc.id,
      documentName: doc.filename,
      summary: buildDocSummary(sectionRows, doc.id)
    }));

    sections.push({
      name: sectionName,
      winnerId: winner?.documentId ?? null,
      winnerName: winner?.documentName ?? null,
      summary,
      scores,
      docSummaries
    });
  }

  if (safeRows.length < 8) {
    qualityFlags.lowQuality.push("Very low attribute coverage (<8 attributes).");
  }

  const completenessByDoc = safeDocuments.map((doc) => {
    const present = safeRows.filter((row) => !isEmpty(row.values[doc.id])).length;
    return { doc, completeness: safeRows.length ? present / safeRows.length : 0 };
  });

  for (const entry of completenessByDoc) {
    if (entry.completeness < 0.4) {
      qualityFlags.incomplete.push(
        `${entry.doc.filename} missing ${Math.round((1 - entry.completeness) * 100)}% of attributes.`
      );
    }
  }

  if (completenessByDoc.length >= 2) {
    const sorted = [...completenessByDoc].sort((a, b) => a.completeness - b.completeness);
    const delta = sorted[sorted.length - 1].completeness - sorted[0].completeness;
    if (delta > 0.35) {
      qualityFlags.imbalanced.push(
        `Document coverage imbalance of ${Math.round(delta * 100)}% between ${sorted[0].doc.filename} and ${sorted[sorted.length - 1].doc.filename}.`
      );
    }
  }

  const sectionScores = sections.flatMap((section) => section.scores);
  const overallScores = new Map<string, number>();
  for (const score of sectionScores) {
    const current = overallScores.get(score.documentId) || 0;
    overallScores.set(score.documentId, current + score.score);
  }

  const overallRank = safeDocuments.map((doc) => ({
    doc,
    score: overallScores.get(doc.id) || 0
  }));
  overallRank.sort((a, b) => b.score - a.score);

  const topOverall = overallRank[0];
  const secondOverall = overallRank[1];
  const overallGap =
    topOverall && secondOverall ? topOverall.score - secondOverall.score : 0;
  const overallWinner =
    topOverall && secondOverall && overallGap <= 4 ? null : topOverall ?? null;

  const overallVerdict = overallWinner
    ? `Recommend ${overallWinner.doc.filename}`
    : "Documents are functionally equivalent";

  const overallJustification = overallWinner
    ? `Leads by ${Math.round(overallGap)} points across ${sections.length} sections.`
    : "Scores are within a narrow band; decision requires additional criteria.";

  const overallConfidence = clampScore(60 + (intentConfidence / 2));

  const improvements: DecisionImprovement[] = [];
  const improvementSeen = new Set<string>();

  for (const section of sections) {
    const sectionRows = sectionMap.get(section.name) || [];
    for (const doc of safeDocuments) {
      const missingRows = sectionRows.filter((row) => isEmpty(row.values[doc.id]));
      for (const row of missingRows.slice(0, 2)) {
        const priority = priorityForSection(section.name);
        const action = `Provide evidence for ${row.displayName}.`;
        const rationale = `${section.name} coverage gap reduces decision confidence.`;
        const key = `${doc.id}:${action}`;
        if (!improvementSeen.has(key)) {
          improvements.push({
            documentId: doc.id,
            documentName: doc.filename,
            priority,
            action,
            rationale,
            impact: createImprovementImpact(priority)
          });
          improvementSeen.add(key);
        }
      }

      for (const row of sectionRows) {
        const numericEntries = safeDocuments
          .map((target) => {
            const raw = row.values[target.id];
            return raw ? { docId: target.id, numeric: parseNumeric(raw) } : null;
          })
          .filter((entry): entry is { docId: string; numeric: NumericValue | null } => Boolean(entry));

        const valid = numericEntries.filter((entry) => entry.numeric !== null) as {
          docId: string;
          numeric: NumericValue;
        }[];
        if (valid.length >= 2) {
          const unitType = valid[0].numeric.unitType;
          const comparable = valid.filter((entry) => entry.numeric.unitType === unitType);
          if (comparable.length >= 2) {
            const values = comparable.map((entry) => entry.numeric.value);
            const min = Math.min(...values);
            const max = Math.max(...values);
            const direction = scoreDirection(row.key);
            const best =
              direction === "higher"
                ? comparable.find((entry) => entry.numeric.value === max)
                : comparable.find((entry) => entry.numeric.value === min);
            if (best && best.docId !== doc.id) {
              const priority = priorityForSection(section.name);
              const action = `Improve ${row.displayName} or justify the tradeoff.`;
              const rationale = `${section.name} underperforms on ${row.displayName}.`;
              const key = `${doc.id}:${action}`;
              if (!improvementSeen.has(key)) {
                improvements.push({
                  documentId: doc.id,
                  documentName: doc.filename,
                  priority,
                  action,
                  rationale,
                  impact: createImprovementImpact(priority)
                });
                improvementSeen.add(key);
              }
            }
          }
        }
      }
    }
  }

  const prioritizedImprovements = improvements
    .sort((a, b) => {
      const weight = (priority: "High" | "Medium" | "Low") =>
        priority === "High" ? 3 : priority === "Medium" ? 2 : 1;
      return weight(b.priority) - weight(a.priority);
    })
    .slice(0, Math.max(6, safeDocuments.length * 3));

  const risks: DecisionRisk[] = [];
  for (const item of qualityFlags.incomplete) {
    risks.push({
      category: "Incomplete evidence",
      severity: "High",
      evidence: item,
      impact: "Decision confidence drops; winner may be misleading."
    });
  }
  for (const item of qualityFlags.lowQuality) {
    risks.push({
      category: "Low-quality extraction",
      severity: "High",
      evidence: item,
      impact: "Outputs reflect missing or noisy data."
    });
  }
  for (const item of qualityFlags.imbalanced) {
    risks.push({
      category: "Coverage imbalance",
      severity: "Medium",
      evidence: item,
      impact: "Comparison favors the more complete document."
    });
  }

  if (!sectionMap.has("Cost")) {
    risks.push({
      category: "Missing cost signals",
      severity: "Medium",
      evidence: "No pricing or cost attributes detected.",
      impact: "Procurement decision lacks total cost visibility."
    });
  }
  if (!sectionMap.has("Security & Compliance")) {
    risks.push({
      category: "Missing compliance signals",
      severity: "Medium",
      evidence: "No security or compliance attributes detected.",
      impact: "Risk posture cannot be validated."
    });
  }
  if (!overallWinner) {
    risks.push({
      category: "No clear winner",
      severity: "Medium",
      evidence: "Scores are tightly clustered across sections.",
      impact: "Decision requires additional criteria or data."
    });
  }

  return {
    intent: {
      primary: topIntent?.label || "Inform",
      confidence: clampScore(intentConfidence),
      rationale: buildSignalRationale(topIntent?.label || "Intent", text, topIntent?.keywords || [])
    },
    audience: {
      primary: topAudience?.label || "Engineering",
      rationale: buildSignalRationale(topAudience?.label || "Audience", text, topAudience?.keywords || [])
    },
    successCriteria:
      successCriteria.length > 0
        ? successCriteria
        : [
            {
              criterion: "Coverage completeness",
              rationale: "Limited signals; prioritize better data capture."
            }
          ],
    sections,
    overall: {
      winnerId: overallWinner?.doc.id ?? null,
      winnerName: overallWinner?.doc.filename ?? null,
      verdict: overallVerdict,
      justification: overallJustification,
      confidence: overallConfidence
    },
    improvements: prioritizedImprovements.length > 0
      ? prioritizedImprovements
      : [
          {
            documentId: safeDocuments[0]?.id ?? "n/a",
            documentName: safeDocuments[0]?.filename ?? "N/A",
            priority: "High",
            action: "Improve document coverage before decision.",
            rationale: "Insufficient data to propose targeted improvements.",
            impact: "Decision remains high-risk without more evidence."
          }
        ],
    risks,
    qualityFlags
  };
}
