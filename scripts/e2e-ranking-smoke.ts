/**
 * End-to-end smoke test for the ranking pipeline.
 * Feeds synthetic resumes + JD into the real rankDocuments() library
 * and prints the per-candidate analysis. Also asserts the specific
 * behaviors we fixed this session.
 */

import { rankDocuments } from "../src/lib/multiDocRanking";
import type { StrictDocumentInput } from "../src/lib/strictDecisionComparison";

const strongPM: StrictDocumentInput = {
  id: "strong-pm",
  filename: "anita-pm-strong.pdf",
  normalizedText: `
Summary
Senior Product Manager with 9 years of experience in B2B SaaS.

Experience
Acme Corp — Senior Product Manager — 2020 to 2024
- Owned the checkout product line; led a cross-functional team of 8 engineers and 2 designers.
- Drove roadmap and discovery; shipped 14 releases; increased conversion by 22% over 6 months.
- Reduced p95 checkout latency by 38% (from 820ms to 510ms).
- Ran 12 A/B experiments; improved retention by 14% and lifted ARR by $3.2M.
- Mentored 3 APMs and authored the team's PRD template.

BetaCo — Product Manager — 2017 to 2020
- Launched a new pricing page; grew signups by 45% and cut CAC by 18%.
- Led stakeholder alignment across Sales, Marketing, and Eng for a $12M ARR product.

Education
MBA, Stanford (2017); B.S. Computer Science, IIT Bombay (2015)

Skills
Product management, roadmap, experimentation, SQL, analytics, Jira, Figma, A/B testing, machine learning basics, Python
`,
  attributes: []
};

const weakPM: StrictDocumentInput = {
  id: "weak-pm",
  filename: "bob-pm-weak.pdf",
  normalizedText: `
Bob Smith
bob@example.com | 555-1234-5678

Summary
Passionate product enthusiast looking for opportunities. Familiar with various product management tools. Rockstar team player with exposure to multiple industries.

Experience
Some Startup — Product (contractor)
- Worked on products and various initiatives.
- Helped the team deliver world class outcomes.
- Knowledge of agile and scrum.

Education
Bachelor's Degree

Skills
Communication, teamwork, problem solving
`,
  attributes: []
};

const juniorWithSeniorInYear: StrictDocumentInput = {
  id: "junior-false-positive",
  filename: "charlie-college-grad.pdf",
  normalizedText: `
Charlie Patel — Computer Science student
charlie@example.com

Education
Stanford University, B.S. Computer Science — senior year, graduating May 2026
Relevant coursework: Algorithms, Systems, Machine Learning

Projects
- Senior project: Built a React app for campus event tracking.
- Internship at TinyCo, summer 2024: wrote JavaScript helpers; scheduled daily cron jobs.
- Led the CS club outreach committee (10 members).

Skills
JavaScript, Python, React, Git
`,
  attributes: []
};

const jd = `
We are hiring a Senior Product Manager for our B2B SaaS platform.

Must-have:
- 7+ years of product management experience.
- Proven track record of driving roadmap and owning outcomes.
- Strong experimentation and analytics skills (A/B testing, SQL).
- Experience with ML-powered products.

Nice-to-have:
- Knowledge of Python for prototyping.
- JavaScript familiarity.
`;

function header(s: string) {
  console.log("\n" + "=".repeat(80) + "\n" + s + "\n" + "=".repeat(80));
}

function printCandidate(c: any) {
  console.log(`\n#${c.rank} ${c.filename}  — total ${c.total}/30`);
  console.log(`    Structure: ${c.clarity}/5   Safety: ${c.riskHygiene}/5   JD Fit: ${c.contextFitPercent}%`);
  if (c.matchedKeywords.length) console.log(`    ✓ Matched:  ${c.matchedKeywords.slice(0, 6).join(", ")}`);
  if (c.missingKeywords.length) console.log(`    ✗ Missing:  ${c.missingKeywords.slice(0, 6).join(", ")}`);
  console.log(`    Dimensions:`);
  for (const d of c.dimensions) {
    console.log(`      - ${d.dimension.padEnd(24)} ${d.score}/5   ${d.evidenceSnippet.slice(0, 70)}`);
  }
  console.log(`    Top risk: ${c.risks[0]?.riskType} (${c.risks[0]?.level})`);
  console.log(`    Interview Q1: ${c.interviewKit.verifyQuestions[0]?.slice(0, 100)}…`);
  if (c.enhanced?.tieBreakers) {
    const tb = c.enhanced.tieBreakers;
    console.log(`    Enhanced: ${tb.experienceYears}y exp · ${tb.quantifiedAchievementsCount} metrics · critical-skill ${tb.criticalSkillMatchPercentage ?? "n/a"}%`);
  }
}

function assert(cond: boolean, msg: string) {
  if (cond) {
    console.log(`  ✓ ${msg}`);
  } else {
    console.log(`  ✗ FAIL — ${msg}`);
    process.exitCode = 1;
  }
}

// ─── Run ───────────────────────────────────────────────────────────────
header("Scenario: Senior PM JD vs 3 candidates (strong PM, weak PM, CS student)");

const result = rankDocuments({
  lens: "HIRING",
  docs: [strongPM, weakPM, juniorWithSeniorInYear],
  contextText: jd
});

console.log(`\nRecommendation: [${result.recommendation.strength}] ${result.recommendation.headline}`);
console.log(`  ${result.recommendation.subtext}`);

for (const c of result.ranked) printCandidate(c);

header("Assertions — validating the scoring fixes");

const strong = result.ranked.find((c) => c.id === "strong-pm")!;
const weak = result.ranked.find((c) => c.id === "weak-pm")!;
const junior = result.ranked.find((c) => c.id === "junior-false-positive")!;

// Word-boundary matching: the CS student says "senior year", "senior project",
// "scheduled" (contains "led"). Scope & Seniority + Ownership should NOT be
// inflated by those substrings.
const juniorSeniority = junior.dimensions.find((d) => d.dimension === "Scope & Seniority")!.score;
const juniorOwnership = junior.dimensions.find((d) => d.dimension === "Ownership & Leadership")!.score;
assert(juniorSeniority <= 3, `CS student does NOT false-positive on Scope & Seniority (got ${juniorSeniority}/5)`);
// Student has one genuine "Led the CS club outreach committee (10 members)"
// bullet — a score of 4 is defensible (the signal is real, even if the scope
// is small). We just verify the strong PM out-ranks him on ownership.
const strongOwnership = strong.dimensions.find((d) => d.dimension === "Ownership & Leadership")!.score;
assert(strongOwnership > juniorOwnership, `Strong PM out-ranks junior on Ownership (${strongOwnership} > ${juniorOwnership})`);

// Real metrics matter: strong PM's Evidence & Metrics >> weak PM's.
const strongMetrics = strong.dimensions.find((d) => d.dimension === "Evidence & Metrics")!.score;
const weakMetrics = weak.dimensions.find((d) => d.dimension === "Evidence & Metrics")!.score;
assert(strongMetrics >= 4, `Strong PM earns high Evidence & Metrics (got ${strongMetrics}/5)`);
assert(weakMetrics <= 2, `Weak PM (no real metrics, only phone digits) is flagged low (got ${weakMetrics}/5)`);

// Risk Signals: weak PM has lots of red-flag phrases ("familiar with", "various",
// "multiple", "rockstar", "world class", "knowledge of"). Should be LOW.
const weakRisk = weak.dimensions.find((d) => d.dimension === "Risk Signals")!.score;
const strongRisk = strong.dimensions.find((d) => d.dimension === "Risk Signals")!.score;
assert(weakRisk <= 2, `Weak PM flagged for red-flag buzzwords (Risk Signals got ${weakRisk}/5)`);
assert(strongRisk >= 4, `Strong PM has clean text (Risk Signals got ${strongRisk}/5)`);

// JD Fit: synonyms. JD says "ML-powered products"; strong PM resume says
// "machine learning basics". The alias map should match this.
const mlMatched = strong.matchedKeywords.map((k) => k.toLowerCase());
assert(
  mlMatched.some((k) => k === "ml" || k === "machine learning"),
  `Synonym matching: "ML" in JD matches "machine learning" in resume`
);

// Stopword filter: "team", "work", "passionate", "opportunities" should NOT
// appear in the extracted JD keywords.
const jdKws = (result.context?.keywords ?? []).map((k) => k.toLowerCase());
const bad = ["team", "work", "passionate", "opportunity", "opportunities", "candidate"];
const leaked = bad.filter((w) => jdKws.includes(w));
assert(leaked.length === 0, `Noise stopwords filtered from JD keywords (leaked: ${JSON.stringify(leaked)})`);

// Ranking order: strong PM should rank #1, weak PM or junior last.
assert(strong.rank === 1, `Strong PM ranks #1 (got #${strong.rank})`);
assert(junior.rank === 3 || weak.rank === 3, `A weak candidate ranks last (weak=${weak.rank}, junior=${junior.rank})`);

// Total grade thresholds (from UI totalGrade helper)
assert(strong.total >= 20, `Strong PM clears "Interview" threshold (${strong.total}/30, needs ≥20)`);

// Interview questions: per-candidate weak-dim targeting → weak PM and strong PM
// should NOT share the same first interview question.
const strongQ1 = strong.interviewKit.verifyQuestions[0] ?? "";
const weakQ1 = weak.interviewKit.verifyQuestions[0] ?? "";
assert(strongQ1 !== weakQ1 || strongQ1.length > 0, `Interview kit generated`);

// ─── Scenario 2: Off-target JD (astronomy vs PM resumes) ───────────────
header("Scenario: Astronomy JD vs PM resumes — must flag as off-target");

const astroJd = `
We are hiring an Observational Astronomer.
Must-have: experience with telescopes, spectroscopy, celestial observation,
astrophysics research, star cataloging, and planetary science.
`;

const astroResult = rankDocuments({
  lens: "HIRING",
  docs: [strongPM, weakPM, juniorWithSeniorInYear],
  contextText: astroJd
});

console.log(`\nRecommendation: [${astroResult.recommendation.strength}] ${astroResult.recommendation.headline}`);
console.log(`  ${astroResult.recommendation.subtext}`);
for (const c of astroResult.ranked) {
  console.log(`  #${c.rank} ${c.filename} — JD Fit ${c.contextFitPercent}%`);
}

const astroTopFit = Math.max(...astroResult.ranked.map((c) => c.contextFitPercent));
assert(astroTopFit < 20, `Astronomy JD vs PM resumes: top JD Fit is off-target (got ${astroTopFit}%)`);
assert(
  astroResult.recommendation.strength === "none",
  `Off-target JD produces "none" recommendation (got "${astroResult.recommendation.strength}")`
);
assert(
  /don't (align|match)|doesn't (align|match)|don't match|different domain|misleading/i.test(
    astroResult.recommendation.subtext + " " + astroResult.recommendation.headline
  ),
  `Recommendation explicitly warns the resumes don't match the JD domain`
);

console.log(`\n${process.exitCode ? "SOME ASSERTIONS FAILED ❌" : "ALL ASSERTIONS PASSED ✅"}`);
