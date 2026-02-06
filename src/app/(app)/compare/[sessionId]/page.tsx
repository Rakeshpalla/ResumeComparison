"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type ComparisonRow = {
  key: string;
  displayName: string;
  values: Record<string, string>;
};

type ComparisonResponse = {
  status: string;
  documents: { id: string; filename: string }[];
  rows: ComparisonRow[];
};

type RecommendationStrength = {
  strength: "strong" | "moderate" | "weak" | "none";
  headline: string;
  subtext: string;
};

type RankResponse = {
  status: string;
  lens: "HIRING";
  documentCount: number;
  contextUsed: boolean;
  contextKeywords: string[];
  recommendation: RecommendationStrength;
  ranked: {
    id: string;
    filename: string;
    rank: number;
    total: number;
    clarity: number;
    riskHygiene: number;
    contextFitPercent: number;
    matchedKeywords: string[];
    missingKeywords: string[];
    dimensions: { dimension: string; score: number; evidenceSnippet: string; scoreReason?: string }[];
    risks: { riskType: string; level: "High" | "Medium" | "Low"; bullets: string[] }[];
    interviewKit: { verifyQuestions: string[]; proofRequests: string[] };
  }[];
};

type HiringUiResponse = {
  lens: "HIRING";
  candidates: { filename: string; candidateName: string }[];
  verdict: {
    winnerFilename: string;
    winnerCandidateName: string;
    loserFilename: string;
    loserCandidateName: string;
    confidence: "High" | "Medium" | "Low";
    rationale: string;
    totals: Record<string, number>;
    verdictStrength?: RecommendationStrength;
  };
  dimensions: {
    dimension: string;
    aScore: number;
    bScore: number;
    winner: "A" | "B";
    aEvidence: string;
    bEvidence: string;
    whyThisMatters: string;
    keyDifference: string;
    decisionImpact: string;
  }[];
  risks: {
    riskType: string;
    observedSignal: string;
    whyItMatters: string;
    riskLevel: "High" | "Medium" | "Low";
    recommendation: string;
    appliesTo: "loser" | "both";
    candidateFilename: string | null;
    candidateName: string | null;
    bullets: string[];
  }[];
  jdContext?:
    | { jdProvided: false }
    | {
        jdProvided: true;
        keywordCount: number;
        keywords: string[];
        candidates: {
          filename: string;
          candidateName: string;
          matchPercent: number;
          matched: string[];
          missing: string[];
        }[];
        defensibility: {
          whyWinnerWins: string[];
          whatWouldFlip: string[];
          verifyInInterview: string[];
        };
      };
};

// ─── Color helpers ───────────────────────────────────────────────────────────

function scoreBarColor(score: number) {
  if (score >= 5) return "bg-emerald-500";
  if (score === 4) return "bg-teal-400";
  if (score === 3) return "bg-amber-400";
  if (score === 2) return "bg-orange-400";
  return "bg-red-500";
}

function scoreTextColor(score: number) {
  if (score >= 5) return "text-emerald-700 bg-emerald-50";
  if (score === 4) return "text-teal-700 bg-teal-50";
  if (score === 3) return "text-amber-700 bg-amber-50";
  if (score === 2) return "text-orange-700 bg-orange-50";
  return "text-red-700 bg-red-50";
}

function scoreLabel(score: number) {
  if (score >= 5) return "Strong";
  if (score === 4) return "Good";
  if (score === 3) return "Average";
  if (score === 2) return "Weak";
  return "Poor";
}

function riskBadge(level: "High" | "Medium" | "Low") {
  if (level === "High") return "bg-red-100 text-red-800 border-red-200";
  if (level === "Medium") return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-emerald-100 text-emerald-800 border-emerald-200";
}

function contextFitColor(percent: number) {
  if (percent >= 70) return "text-emerald-700";
  if (percent >= 40) return "text-amber-700";
  return "text-red-700";
}

/** Recommendation banner styling based on strength */
function strengthBanner(strength: string) {
  if (strength === "strong") return "border-emerald-300 bg-emerald-50";
  if (strength === "moderate") return "border-amber-300 bg-amber-50";
  if (strength === "weak") return "border-orange-300 bg-orange-50";
  return "border-red-300 bg-red-50"; // none
}
function strengthIcon(strength: string) {
  if (strength === "strong") return "\u2705"; // checkmark
  if (strength === "moderate") return "\u26A0\uFE0F"; // warning
  if (strength === "weak") return "\u2753"; // question
  return "\u274C"; // cross
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ComparePage() {
  const params = useParams();
  const sessionId = (params?.sessionId as string) ?? "";
  const [data, setData] = useState<ComparisonResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const lens = "hiring";
  const [exportError, setExportError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [hiringUi, setHiringUi] = useState<HiringUiResponse | null>(null);
  const [rankUi, setRankUi] = useState<RankResponse | null>(null);
  const [hiringView, setHiringView] = useState<"dashboard" | "attributes">("dashboard");
  const [jobDescription, setJobDescription] = useState<string>("");
  const [isEditingContext, setIsEditingContext] = useState(false);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);

  useEffect(() => { setHiringView("dashboard"); }, []);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(`jdText:${sessionId}`);
      if (stored && stored.trim().length > 0) { setJobDescription(stored); setIsEditingContext(false); }
    } catch { /* ignore */ }
  }, [sessionId]);

  useEffect(() => {
    try {
      const key = `jdText:${sessionId}`;
      if (jobDescription.trim().length === 0) window.localStorage.removeItem(key);
      else window.localStorage.setItem(key, jobDescription);
    } catch { /* ignore */ }
  }, [jobDescription, sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    let active = true;
    let timeout: NodeJS.Timeout;
    async function poll() {
      try {
        const response = await fetch(`/api/sessions/${sessionId}/compare`, { cache: "no-store" });
        if (response.status === 401) { window.location.href = "/login"; return; }
        if (!response.ok) { const body = await response.json(); throw new Error(body.error || "Failed to load."); }
        const payload = (await response.json()) as ComparisonResponse;
        if (!active) return;
        setData(payload); setError(null);
        if (payload.status !== "COMPLETED") timeout = setTimeout(poll, 3000);
      } catch (err) { if (active) setError(err instanceof Error ? err.message : "Unexpected error."); }
    }
    poll();
    return () => { active = false; if (timeout) clearTimeout(timeout); };
  }, [sessionId, retryCount]);

  useEffect(() => {
    if (!sessionId) return;
    let active = true;
    async function loadHiringUi() {
      if (data?.documents && data.documents.length > 2) { setHiringUi(null); return; }
      try {
        const jd = jobDescription.trim();
        const response = jd.length > 0
          ? await fetch(`/api/sessions/${sessionId}/hiring-ui?lens=hiring`, { method: "POST", cache: "no-store", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jdText: jd }) })
          : await fetch(`/api/sessions/${sessionId}/hiring-ui?lens=hiring`, { cache: "no-store" });
        if (response.status === 401) { window.location.href = "/login"; return; }
        if (!response.ok) { setHiringUi(null); return; }
        if (!active) return;
        setHiringUi((await response.json()) as HiringUiResponse);
      } catch { setHiringUi(null); }
    }
    loadHiringUi();
    return () => { active = false; };
  }, [sessionId, jobDescription, data?.documents]);

  useEffect(() => {
    if (!sessionId) return;
    let active = true;
    async function loadRank() {
      if (!data?.documents || data.documents.length <= 2) { setRankUi(null); return; }
      try {
        const ctx = jobDescription.trim();
        const url = `/api/sessions/${sessionId}/rank?lens=${lens}`;
        const response = ctx.length > 0
          ? await fetch(url, { method: "POST", cache: "no-store", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contextText: ctx }) })
          : await fetch(url, { cache: "no-store" });
        if (response.status === 401) { window.location.href = "/login"; return; }
        if (!response.ok) { setRankUi(null); return; }
        if (!active) return;
        const payload = (await response.json()) as RankResponse;
        setRankUi(payload);
        const ranked = Array.isArray(payload.ranked) ? payload.ranked : [];
        setSelectedDocIds((prev) => prev.length === 2 ? prev : ranked.slice(0, 2).map((d) => d.id));
      } catch { setRankUi(null); }
    }
    loadRank();
    return () => { active = false; };
  }, [data?.documents, jobDescription, lens, sessionId]);

  async function handleExportExcel() {
    setExportError(null); setIsExporting(true);
    try {
      const q = [`lens=${lens}`];
      if (data?.documents && data.documents.length > 2 && selectedDocIds.length === 2) q.push(`docIds=${encodeURIComponent(selectedDocIds.join(","))}`);
      const url = `/api/sessions/${sessionId}/export-xlsx?${q.join("&")}`;
      const jd = jobDescription.trim();
      const response = jd.length > 0
        ? await fetch(url, { method: "POST", cache: "no-store", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jdText: jd }) })
        : await fetch(url, { cache: "no-store" });
      if (response.status === 401) { window.location.href = "/login"; return; }
      if (!response.ok) {
        const j = (await response.json().catch(() => null)) as { error?: string } | null;
        setExportError(j?.error || `Export failed (HTTP ${response.status}).`); return;
      }
      const blob = await response.blob();
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
      a.download = `resume-comparison-${sessionId}.xlsx`; document.body.appendChild(a); a.click(); a.remove();
    } catch (err) { setExportError(err instanceof Error ? err.message : "Export failed."); }
    finally { setIsExporting(false); }
  }

  const evidenceSnippet = (value: string) => {
    const cleaned = value.replace(/^\s*-\s*/gm, "").split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 2).join(" \u2022 ");
    return cleaned.length > 0 ? cleaned : "No concrete evidence found in resume.";
  };

  const asBullets = (text: string) => {
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => l.replace(/^[-\u2022]\s*/, ""));
    return lines.length > 1 ? lines : null;
  };

  const hasJd = jobDescription.trim().split(/\s+/).filter((w) => w.length >= 2).length >= 3;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Resume comparison</h1>
          <p className="mt-1 text-sm text-slate-600">
            {data?.documents && data.documents.length > 2 ? "All uploaded candidates ranked." : "Side-by-side candidate analysis."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70" onClick={handleExportExcel} disabled={isExporting}>
            {isExporting ? "Exporting..." : "Export decision Excel"}
          </button>
          <a className="rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" href={`/api/sessions/${sessionId}/export`}>Export raw CSV</a>
        </div>
      </div>

      {/* No-JD Warning */}
      {!hasJd && (
        <div className="rounded-lg border-2 border-blue-200 bg-blue-50 px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="text-xl">&#x1F4CB;</span>
            <div>
              <div className="text-sm font-semibold text-blue-900">No job description provided</div>
              <div className="mt-1 text-sm text-blue-800">
                Results below compare <strong>resume quality only</strong> (structure, metrics, ownership signals) — not job fit.
                For meaningful recommendations, paste the actual job description below.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Job Description Context */}
      <div className="rounded border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">Job Description</div>
            <div className="mt-1 text-xs text-slate-500">Paste a real JD (5+ words) for keyword-aligned fit scores and targeted interview questions.</div>
          </div>
          <div className="flex gap-2">
            <button type="button" className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50" onClick={() => setIsEditingContext((v) => !v)}>
              {isEditingContext ? "Hide editor" : "Edit JD"}
            </button>
            {jobDescription.trim().length > 0 && (
              <button type="button" className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50" onClick={() => setJobDescription("")}>Clear</button>
            )}
          </div>
        </div>
        {!isEditingContext ? (
          <div className="mt-3 text-sm text-slate-700">
            {jobDescription.trim().length > 0 ? `${jobDescription.trim().slice(0, 180)}${jobDescription.trim().length > 180 ? "\u2026" : ""}` : "No job description provided yet."}
          </div>
        ) : (
          <>
            <textarea className="mt-3 w-full resize-y rounded border border-slate-300 px-3 py-2 text-sm text-slate-800" rows={5} value={jobDescription} placeholder="Paste the full job description here (requirements, skills, responsibilities). Minimum 3 words." onChange={(e) => setJobDescription(e.target.value)} />
            <div className="mt-2 text-xs text-slate-500">Tip: Paste the actual JD with key requirements. Short/vague text like &quot;Test&quot; will be ignored.</div>
          </>
        )}
      </div>

      {/* JD Fit Snapshot */}
      {hiringUi?.jdContext && hiringUi.jdContext.jdProvided ? (
        <div className="rounded border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold text-slate-900">JD fit snapshot</div>
          <div className="mt-1 text-xs text-slate-500">Based on keyword alignment from pasted JD (top {hiringUi.jdContext.keywordCount} terms).</div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {hiringUi.jdContext.candidates.slice(0, 2).map((c) => (
              <div key={c.filename} className="rounded border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{c.candidateName}</div>
                    <div className="mt-1 text-xs text-slate-500">{c.filename}</div>
                  </div>
                  <div className={`text-sm font-semibold ${contextFitColor(c.matchPercent)}`}>{c.matchPercent}% fit</div>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-slate-100">
                  <div className={`h-2 rounded-full ${c.matchPercent >= 70 ? "bg-emerald-500" : c.matchPercent >= 40 ? "bg-amber-400" : "bg-red-400"}`} style={{ width: `${Math.min(100, Math.max(0, c.matchPercent))}%` }} />
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Matches</div>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                      {(c.matched.length > 0 ? c.matched : ["No strong matches surfaced."]).map((k) => <li key={k}>{k}</li>)}
                    </ul>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-red-600">Gaps</div>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                      {(c.missing.length > 0 ? c.missing : ["No major gaps detected."]).map((k) => <li key={k}>{k}</li>)}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div className="rounded border border-emerald-200 bg-emerald-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Why the winner wins</div>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">{hiringUi.jdContext.defensibility.whyWinnerWins.map((b) => <li key={b}>{b}</li>)}</ul>
            </div>
            <div className="rounded border border-amber-200 bg-amber-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">What would flip it</div>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">{hiringUi.jdContext.defensibility.whatWouldFlip.map((b) => <li key={b}>{b}</li>)}</ul>
            </div>
            <div className="rounded border border-blue-200 bg-blue-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-blue-700">Verify in interview</div>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">{hiringUi.jdContext.defensibility.verifyInInterview.map((q) => <li key={q}>{q}</li>)}</ul>
            </div>
          </div>
        </div>
      ) : null}

      {exportError && <div className="rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{exportError}</div>}
      {error && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <div><div className="font-semibold">Data issue.</div><div>{error}</div></div>
          <button type="button" className="rounded border border-amber-300 bg-white px-3 py-1 text-sm font-medium text-amber-900 hover:bg-amber-100" onClick={() => setRetryCount((c) => c + 1)}>Retry</button>
        </div>
      )}

      {!sessionId ? (
        <div className="rounded border border-slate-200 bg-white p-6 text-sm text-slate-600">Invalid session. Please go back to the upload page.</div>
      ) : !data ? (
        <div className="rounded border border-slate-200 bg-white p-6 text-sm text-slate-600">Loading comparison data...</div>
      ) : (
        <div className="flex flex-col gap-6">

          {/* ─── Multi-doc ranking (3+ resumes) ─── */}
          {rankUi && data.documents.length > 2 ? (
            <div className="rounded border border-slate-200 bg-white p-6 shadow-sm">
              {/* Honest recommendation banner */}
              <div className={`rounded-lg border-2 p-4 mb-5 ${strengthBanner(rankUi.recommendation.strength)}`}>
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{strengthIcon(rankUi.recommendation.strength)}</span>
                  <div>
                    <div className="text-base font-semibold text-slate-900">{rankUi.recommendation.headline}</div>
                    <div className="mt-1 text-sm text-slate-700">{rankUi.recommendation.subtext}</div>
                    {rankUi.recommendation.strength !== "none" && (
                      <div className="mt-2 text-sm text-slate-600">
                        {rankUi.recommendation.strength === "strong" ? `Top candidate: ${rankUi.ranked[0]?.filename}` : `Top by structure: ${rankUi.ranked[0]?.filename} — verify JD fit before deciding`}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-sm text-slate-700">
                    {rankUi.documentCount} resumes compared{" "}
                    {rankUi.contextUsed ? `\u00b7 JD keywords: ${rankUi.contextKeywords.slice(0, 5).join(", ")}` : "\u00b7 Resume quality comparison only (no JD)"}
                  </div>
                </div>
                <div className="rounded border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  Select <span className="font-semibold">2</span> candidates for the Excel decision file.
                </div>
              </div>

              <div className="mt-5 overflow-x-auto rounded border border-slate-200">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="bg-slate-50">
                    <tr className="border-b border-slate-200">
                      <th className="px-4 py-3 font-semibold text-slate-700">Select</th>
                      <th className="px-4 py-3 font-semibold text-slate-700">Rank</th>
                      <th className="px-4 py-3 font-semibold text-slate-700">Candidate</th>
                      <th className="px-4 py-3 font-semibold text-slate-700">Total</th>
                      {rankUi.contextUsed && <th className="px-4 py-3 font-semibold text-slate-700">JD Fit</th>}
                      <th className="px-4 py-3 font-semibold text-slate-700">Dimension scores</th>
                      <th className="px-4 py-3 font-semibold text-slate-700">Risks + interview</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankUi.ranked.map((doc) => (
                      <tr key={doc.id} className="border-b border-slate-100 align-top">
                        <td className="px-4 py-3">
                          <input type="checkbox" checked={selectedDocIds.includes(doc.id)} onChange={() => setSelectedDocIds((prev) => {
                            if (prev.includes(doc.id)) return prev.filter((id) => id !== doc.id);
                            if (prev.length >= 2) return [prev[1], doc.id];
                            return [...prev, doc.id];
                          })} />
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full font-semibold text-white ${doc.rank === 1 ? "bg-emerald-600" : doc.rank === 2 ? "bg-teal-500" : "bg-slate-400"}`}>#{doc.rank}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          <div className="font-semibold">{doc.filename}</div>
                          <div className="mt-1 flex gap-2 text-xs">
                            <span className={`rounded px-1.5 py-0.5 font-medium ${scoreTextColor(doc.clarity)}`}>Clarity {doc.clarity}/5</span>
                            <span className={`rounded px-1.5 py-0.5 font-medium ${scoreTextColor(doc.riskHygiene)}`}>Risk hygiene {doc.riskHygiene}/5</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-lg font-bold text-slate-900">{doc.total}</span><span className="text-xs text-slate-500"> / 30</span>
                        </td>
                        {rankUi.contextUsed && (
                          <td className="px-4 py-3">
                            <div className={`text-lg font-semibold ${contextFitColor(doc.contextFitPercent)}`}>{doc.contextFitPercent}%</div>
                            {doc.missingKeywords.length > 0 && <div className="mt-1 text-xs text-red-600">Gaps: {doc.missingKeywords.slice(0, 3).join(", ")}</div>}
                          </td>
                        )}
                        <td className="px-4 py-3">
                          <div className="grid gap-2">
                            {doc.dimensions.map((d) => (
                              <div key={d.dimension} className="rounded border border-slate-200 p-2">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-semibold text-slate-700">{d.dimension}</span>
                                  <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${scoreTextColor(d.score)}`}>{d.score}/5 {scoreLabel(d.score)}</span>
                                </div>
                                <div className="mt-1 h-2 w-full rounded-full bg-slate-100">
                                  <div className={`h-2 rounded-full ${scoreBarColor(d.score)}`} style={{ width: `${d.score * 20}%` }} />
                                </div>
                                {d.scoreReason && <div className="mt-1.5 text-xs text-slate-600 italic">{d.scoreReason}</div>}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          <div className="space-y-3">
                            <div>
                              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Risks</div>
                              <div className="mt-2 space-y-2">
                                {doc.risks.slice(0, 2).map((r) => (
                                  <div key={`${doc.id}-${r.riskType}`} className="rounded border border-slate-200 p-2">
                                    <div className="flex items-center justify-between">
                                      <div className="font-semibold text-slate-900 text-xs">{r.riskType}</div>
                                      <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${riskBadge(r.level)}`}>{r.level}</span>
                                    </div>
                                    <ul className="mt-1.5 list-disc space-y-1 pl-5 text-xs text-slate-700">{r.bullets.map((b) => <li key={b}>{b}</li>)}</ul>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Interview questions</div>
                              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-700">{doc.interviewKit.verifyQuestions.slice(0, 2).map((q) => <li key={q}>{q}</li>)}</ul>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {/* ─── 2-doc hiring dashboard ─── */}
          {data.documents.length <= 2 ? (
            <div className="rounded border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex gap-2">
                  <button type="button" className={hiringView === "dashboard" ? "rounded bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white" : "rounded border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"} onClick={() => setHiringView("dashboard")}>Hiring dashboard</button>
                  <button type="button" className={hiringView === "attributes" ? "rounded bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white" : "rounded border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"} onClick={() => setHiringView("attributes")}>Raw attributes</button>
                </div>
              </div>

              {hiringView === "dashboard" ? (
                !hiringUi ? (
                  <div className="mt-5 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Loading hiring dashboard...</div>
                ) : (() => {
                  const c1 = hiringUi.candidates[0];
                  const c2 = hiringUi.candidates[1];
                  const c1Label = c1?.candidateName || c1?.filename || "Candidate 1";
                  const c2Label = c2?.candidateName || c2?.filename || "Candidate 2";
                  const t1 = hiringUi.verdict.totals[c1?.filename ?? ""] ?? 0;
                  const t2 = hiringUi.verdict.totals[c2?.filename ?? ""] ?? 0;
                  const maxT = Math.max(t1, t2, 1);
                  const vs = hiringUi.verdict.verdictStrength;

                  return (
                    <>
                      {/* Honest verdict banner */}
                      {vs && (
                        <div className={`mt-5 rounded-lg border-2 p-5 ${strengthBanner(vs.strength)}`}>
                          <div className="flex items-start gap-3">
                            <span className="text-2xl">{strengthIcon(vs.strength)}</span>
                            <div>
                              <div className="text-base font-semibold text-slate-900">{vs.headline}</div>
                              <div className="mt-1 text-sm text-slate-700">{vs.subtext}</div>
                              {(vs.strength === "strong" || vs.strength === "moderate") && (
                                <div className="mt-2 text-sm font-medium text-slate-800">
                                  {vs.strength === "strong" ? "Recommended" : "Relatively stronger"}: {hiringUi.verdict.winnerCandidateName} ({hiringUi.verdict.winnerFilename})
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Fallback if no verdictStrength from API (backward compat) */}
                      {!vs && (
                        <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
                          <div className="text-sm text-slate-700">{hiringUi.verdict.rationale}</div>
                        </div>
                      )}

                      {/* Score snapshot */}
                      <div className="mt-5 rounded border border-slate-200 p-4">
                        <div className="text-sm font-semibold text-slate-900">Score comparison ({hasJd ? "resume quality + JD alignment" : "resume quality only"})</div>
                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          {[{ label: c1Label, file: c1?.filename, total: t1 }, { label: c2Label, file: c2?.filename, total: t2 }].map((c) => {
                            const isWinner = hiringUi.verdict.winnerFilename === c.file;
                            return (
                              <div key={c.label}>
                                <div className="flex items-center justify-between text-xs text-slate-500">
                                  <span className="font-medium">{c.label} {isWinner && vs?.strength !== "none" && vs?.strength !== "weak" && <span className="text-emerald-600">(Stronger)</span>}</span>
                                  <span className="font-semibold text-slate-900">{c.total}/30</span>
                                </div>
                                <div className="mt-1 h-3 w-full rounded-full bg-slate-100">
                                  <div className={`h-3 rounded-full ${isWinner && vs?.strength !== "none" ? "bg-emerald-500" : "bg-slate-400"}`} style={{ width: `${Math.round((c.total / maxT) * 100)}%` }} />
                                </div>
                                <div className="mt-1 text-xs text-slate-500">{c.file}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Dimension table */}
                      <div className="mt-6 rounded border border-slate-200">
                        <table className="w-full table-fixed border-collapse text-left text-sm">
                          <thead className="bg-slate-50">
                            <tr className="border-b border-slate-200">
                              <th className="w-[160px] px-4 py-3 font-semibold text-slate-700">Dimension</th>
                              <th className="w-[200px] px-4 py-3 font-semibold text-slate-700">Scores<div className="mt-1 text-xs font-normal text-slate-500">{c1Label} vs {c2Label}</div></th>
                              <th className="w-[340px] px-4 py-3 font-semibold text-slate-700">Evidence</th>
                              <th className="px-4 py-3 font-semibold text-slate-700">Impact</th>
                            </tr>
                          </thead>
                          <tbody>
                            {hiringUi.dimensions.map((row) => (
                              <tr key={row.dimension} className="border-b border-slate-100 align-top">
                                <td className="px-4 py-3 font-semibold text-slate-900">{row.dimension}</td>
                                <td className="px-4 py-3">
                                  <div className="grid gap-2">
                                    {[{ label: c1Label, score: row.aScore }, { label: c2Label, score: row.bScore }].map((s) => (
                                      <div key={s.label}>
                                        <div className="flex items-center justify-between text-xs text-slate-500">
                                          <span>{s.label}</span>
                                          <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${scoreTextColor(s.score)}`}>{s.score}/5</span>
                                        </div>
                                        <div className="mt-1 h-2 w-full rounded-full bg-slate-100">
                                          <div className={`h-2 rounded-full ${scoreBarColor(s.score)}`} style={{ width: `${s.score * 20}%` }} />
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </td>
                                <td className="px-4 py-3 align-top">
                                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{c1Label}</div>
                                  <div className="mt-1 text-sm text-slate-700 break-words whitespace-normal">{evidenceSnippet(row.aEvidence)}</div>
                                  <div className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{c2Label}</div>
                                  <div className="mt-1 text-sm text-slate-700 break-words whitespace-normal">{evidenceSnippet(row.bEvidence)}</div>
                                </td>
                                <td className="px-4 py-3 text-slate-700 align-top break-words whitespace-normal">
                                  <div className="space-y-2">
                                    <div className="text-sm">{(() => { const b = asBullets(row.whyThisMatters); return b ? <ul className="list-disc space-y-1 pl-5">{b.map((x) => <li key={x}>{x}</li>)}</ul> : row.whyThisMatters; })()}</div>
                                    <div className="text-sm font-semibold text-slate-900">{(() => { const b = asBullets(row.decisionImpact); return b ? <ul className="list-disc space-y-1 pl-5 font-semibold">{b.map((x) => <li key={x}>{x}</li>)}</ul> : row.decisionImpact; })()}</div>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Risks */}
                      <div className="mt-6 rounded border border-slate-200 p-4">
                        <div className="text-sm font-semibold text-slate-900">Risk signals</div>
                        <div className="mt-3 grid gap-4 md:grid-cols-2">
                          {[c1, c2].map((candidate) => {
                            const relevant = hiringUi.risks.filter((r) => r.appliesTo === "both" || r.candidateFilename === candidate?.filename);
                            const label = candidate?.candidateName || candidate?.filename || "Candidate";
                            return (
                              <div key={candidate?.filename || label} className="rounded border border-slate-200 p-4">
                                <div className="text-sm font-semibold text-slate-900">{label}</div>
                                <div className="mt-1 text-xs text-slate-500">{candidate?.filename}</div>
                                <div className="mt-3 space-y-2">
                                  {relevant.slice(0, 4).map((risk) => (
                                    <div key={`${risk.riskType}-${risk.observedSignal}`} className="flex items-start gap-2">
                                      <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${riskBadge(risk.riskLevel)}`}>{risk.riskLevel}</span>
                                      <div className="text-sm text-slate-700">
                                        <div className="font-semibold">{risk.riskType}</div>
                                        <ul className="mt-1 list-disc space-y-1 pl-5 text-xs">
                                          {(risk.bullets?.length > 0 ? risk.bullets : [risk.observedSignal, `Fix: ${risk.recommendation}`]).map((b) => <li key={b}>{b}</li>)}
                                        </ul>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  );
                })()
              ) : (
                /* Raw attributes view */
                <div className="mt-5">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
                    <div>Status: {data.status}</div>
                    <div>{data.rows.length === 0 ? "Extraction in progress." : `${data.rows.length} attributes compared.`}</div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50">
                          <th className="px-3 py-2 font-semibold text-slate-700">Attribute</th>
                          {data.documents.map((doc) => <th key={doc.id} className="px-3 py-2 font-semibold text-slate-700">{doc.filename}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {data.rows.map((row) => (
                          <tr key={row.key} className="border-b border-slate-100">
                            <td className="px-3 py-2 font-medium text-slate-700">{row.displayName}</td>
                            {data.documents.map((doc) => <td key={doc.id} className="px-3 py-2 text-slate-600">{row.values[doc.id] || "\u2014"}</td>)}
                          </tr>
                        ))}
                        {data.rows.length === 0 && (
                          <tr><td className="px-3 py-6 text-center text-sm text-slate-500" colSpan={data.documents.length + 1}>Waiting for extraction to complete.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
