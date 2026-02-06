type DocumentInfo = { id: string; filename: string };

export type ComparisonRow = {
  key: string;
  displayName: string;
  values: Record<string, string>;
};

export type VerdictMetric = {
  key: "strategicStrength" | "credibility" | "senioritySignal" | "riskLevel";
  label: string;
  score: number;
  detail: string;
};

export type VerdictDocumentScore = {
  id: string;
  filename: string;
  score: number;
  completeness: number;
  numericPerformance: number;
  keyCoverage: number;
};

export type Verdict = {
  metrics: VerdictMetric[];
  recommendation: {
    title: string;
    detail: string;
    topDocumentId: string | null;
    topDocumentName: string | null;
  };
  documentScores: VerdictDocumentScore[];
};

const KEY_ATTRIBUTE_HINTS = [
  "processor",
  "cpu",
  "memory",
  "ram",
  "storage",
  "storage_capacity",
  "price",
  "warranty",
  "weight",
  "battery",
  "resolution"
];

const SENIORITY_SIGNAL_HINTS = [
  "warranty",
  "support",
  "sla",
  "security",
  "compliance",
  "certification",
  "integration",
  "management",
  "availability",
  "uptime"
];

const EMPTY_VALUE = new Set(["", "-", "—", "n/a", "na", "not available", "unknown", "tbd"]);

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

export function buildVerdict(
  documents: DocumentInfo[],
  rows: ComparisonRow[]
): Verdict {
  if (documents.length === 0) {
    return {
      metrics: [
        {
          key: "strategicStrength",
          label: "Strategic Strength",
          score: 0,
          detail: "No documents available to evaluate."
        },
        {
          key: "credibility",
          label: "Credibility",
          score: 0,
          detail: "No data extracted for comparison."
        },
        {
          key: "senioritySignal",
          label: "Seniority Signal",
          score: 0,
          detail: "No signals captured yet."
        },
        {
          key: "riskLevel",
          label: "Risk Level",
          score: 100,
          detail: "Decision risk is extreme without evidence."
        }
      ],
      recommendation: {
        title: "No recommendation",
        detail: "Upload at least two documents to generate a verdict.",
        topDocumentId: null,
        topDocumentName: null
      },
      documentScores: []
    };
  }

  const attributeCount = Math.max(rows.length, 1);
  const keyAttributes = KEY_ATTRIBUTE_HINTS.map((hint) => hint.toLowerCase());
  const docStats = new Map<
    string,
    {
      valueCount: number;
      numericScoreSum: number;
      numericScoreCount: number;
      keyCoverageCount: number;
    }
  >();

  for (const doc of documents) {
    docStats.set(doc.id, {
      valueCount: 0,
      numericScoreSum: 0,
      numericScoreCount: 0,
      keyCoverageCount: 0
    });
  }

  let comparableAttributes = 0;
  let inconsistentAttributes = 0;
  const presentSignals = new Set<string>();

  for (const row of rows) {
    const rowValues = documents.map((doc) => row.values[doc.id]);
    const availableValues = rowValues.filter((value) => !isEmpty(value));
    const keyLower = row.key.toLowerCase();

    if (keyAttributes.some((hint) => keyLower.includes(hint))) {
      for (const doc of documents) {
        if (!isEmpty(row.values[doc.id])) {
          docStats.get(doc.id)!.keyCoverageCount += 1;
        }
      }
    }

    for (const hint of SENIORITY_SIGNAL_HINTS) {
      if (keyLower.includes(hint) && availableValues.length > 0) {
        presentSignals.add(hint);
      }
    }

    for (const doc of documents) {
      if (!isEmpty(row.values[doc.id])) {
        docStats.get(doc.id)!.valueCount += 1;
      }
    }

    const numericValues = documents
      .map((doc) => {
        const raw = row.values[doc.id];
        return raw ? { docId: doc.id, numeric: parseNumeric(raw) } : null;
      })
      .filter((entry): entry is { docId: string; numeric: NumericValue | null } => Boolean(entry));

    const validNumeric = numericValues.filter((entry) => entry.numeric !== null) as {
      docId: string;
      numeric: NumericValue;
    }[];

    if (validNumeric.length >= 2) {
      const unitType = validNumeric[0].numeric.unitType;
      const comparable = validNumeric.filter(
        (entry) => entry.numeric.unitType === unitType
      );

      if (comparable.length >= 2) {
        comparableAttributes += 1;
        const values = comparable.map((entry) => entry.numeric.value);
        const min = Math.min(...values);
        const max = Math.max(...values);
        const direction = scoreDirection(row.key);
        for (const entry of comparable) {
          let normalized = 0.5;
          if (max !== min) {
            normalized =
              direction === "higher"
                ? (entry.numeric.value - min) / (max - min)
                : (max - entry.numeric.value) / (max - min);
          }
          docStats.get(entry.docId)!.numericScoreSum += normalized;
          docStats.get(entry.docId)!.numericScoreCount += 1;
        }
      } else {
        inconsistentAttributes += 1;
      }
    } else if (availableValues.length > 0 && validNumeric.length > 0) {
      inconsistentAttributes += 1;
    }
  }

  const keyCoverageDenominator = Math.max(1, KEY_ATTRIBUTE_HINTS.length);

  const documentScores: VerdictDocumentScore[] = documents.map((doc) => {
    const stats = docStats.get(doc.id)!;
    const completeness = stats.valueCount / attributeCount;
    const numericPerformance =
      stats.numericScoreCount > 0
        ? stats.numericScoreSum / stats.numericScoreCount
        : 0.4;
    const keyCoverage = stats.keyCoverageCount / keyCoverageDenominator;
    const score =
      (0.45 * completeness + 0.35 * numericPerformance + 0.2 * keyCoverage) *
      100;
    return {
      id: doc.id,
      filename: doc.filename,
      score: clampScore(score),
      completeness: clampScore(completeness * 100),
      numericPerformance: clampScore(numericPerformance * 100),
      keyCoverage: clampScore(keyCoverage * 100)
    };
  });

  documentScores.sort((a, b) => b.score - a.score);

  const averageCompleteness =
    documentScores.reduce((sum, doc) => sum + doc.completeness, 0) /
    (documentScores.length || 1);
  const missingRate = 1 - averageCompleteness / 100;
  const comparableRatio = comparableAttributes / attributeCount;
  const inconsistencyRate = inconsistentAttributes / attributeCount;

  const credibilityScore = clampScore(
    100 - missingRate * 60 - inconsistencyRate * 30
  );

  const senioritySignalScore = clampScore(
    10 + (presentSignals.size / SENIORITY_SIGNAL_HINTS.length) * 90
  );

  const topDoc = documentScores[0] ?? null;
  const secondDoc = documentScores[1] ?? null;
  const leadGap = topDoc && secondDoc ? topDoc.score - secondDoc.score : 0;
  const strategicStrengthScore = topDoc ? topDoc.score : 0;

  const riskScore = clampScore(100 - credibilityScore + missingRate * 20);

  const recommendationTitle = topDoc
    ? leadGap >= 10
      ? `Recommend: ${topDoc.filename}`
      : `Edge: ${topDoc.filename}`
    : "No recommendation";

  const recommendationDetail = topDoc
    ? leadGap >= 10
      ? `Best balance of coverage and numeric advantage with a ${leadGap} point lead.`
      : "Top option leads, but margin is thin—validate with additional evidence."
    : "Upload and process documents to generate a verdict.";

  return {
    metrics: [
      {
        key: "strategicStrength",
        label: "Strategic Strength",
        score: strategicStrengthScore,
        detail: "Strength of the top option based on coverage and numeric wins."
      },
      {
        key: "credibility",
        label: "Credibility",
        score: credibilityScore,
        detail: "Data quality based on completeness and consistency."
      },
      {
        key: "senioritySignal",
        label: "Seniority Signal",
        score: senioritySignalScore,
        detail: "Presence of enterprise-grade signals (support, SLA, compliance)."
      },
      {
        key: "riskLevel",
        label: "Risk Level",
        score: riskScore,
        detail: "Lower is better. High risk means weak or inconsistent evidence."
      }
    ],
    recommendation: {
      title: recommendationTitle,
      detail: recommendationDetail,
      topDocumentId: topDoc?.id ?? null,
      topDocumentName: topDoc?.filename ?? null
    },
    documentScores
  };
}
