"use client";

import { useEffect, useMemo, useState } from "react";
import type { Verdict } from "../../../../lib/verdict";

type ComparisonRow = {
  key: string;
  displayName: string;
  values: Record<string, string>;
};

type ComparisonResponse = {
  status: string;
  documents: { id: string; filename: string }[];
  rows: ComparisonRow[];
  verdict?: Verdict;
};

type RankResponse = {
  status: string;
  lens: "HIRING" | "RFP" | "SALES";
  documentCount: number;
  contextUsed: boolean;
  contextKeywords: string[];
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

/** Score bar color: 5=green, 4=teal, 3=amber, 2=orange, 1=red */
function scoreBarColor(score: number): string {
  if (score >= 5) return "bg-emerald-500";
  if (score === 4) return "bg-teal-400";
  if (score === 3) return "bg-amber-400";
  if (score === 2) return "bg-orange-400";
  return "bg-red-500";
}

/** Score text color for the number badge */
function scoreTextColor(score: number): string {
  if (score >= 5) return "text-emerald-700 bg-emerald-50";
  if (score === 4) return "text-teal-700 bg-teal-50";
  if (score === 3) return "text-amber-700 bg-amber-50";
  if (score === 2) return "text-orange-700 bg-orange-50";
  return "text-red-700 bg-red-50";
}

/** Score label for recruiters */
function scoreLabel(score: number): string {
  if (score >= 5) return "Strong";
  if (score === 4) return "Good";
  if (score === 3) return "Average";
  if (score === 2) return "Weak";
  return "Poor";
}

/** Risk badge styling */
function riskBadge(level: "High" | "Medium" | "Low") {
  if (level === "High") return "bg-red-100 text-red-800 border-red-200";
  if (level === "Medium") return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-emerald-100 text-emerald-800 border-emerald-200";
}

/** Context fit color */
function contextFitColor(percent: number): string {
  if (percent >= 70) return "text-emerald-700";
  if (percent >= 40) return "text-amber-700";
  return "text-red-700";
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ComparePage({
  params
}: {
  params: { sessionId: string };
}) {
  const { sessionId } = params;
  const [data, setData] = useState<ComparisonResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const lens = "hiring"; // Hardcoded to hiring lens for MVP
  const [exportError, setExportError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [hiringUi, setHiringUi] = useState<HiringUiResponse | null>(null);
  const [rankUi, setRankUi] = useState<RankResponse | null>(null);
  const [hiringView, setHiringView] = useState<"dashboard" | "attributes">("dashboard");
  const [jobDescription, setJobDescription] = useState<string>("");
  const [isEditingContext, setIsEditingContext] = useState(false);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);

  // Always use Hiring lens for MVP (no auto-detection needed).

  useEffect(() => {
    setHiringView("dashboard");
  }, []);

  useEffect(() => {
    try {
      const key = `jdText:${sessionId}`;
      const stored = window.localStorage.getItem(key);
      if (stored && stored.trim().length > 0) {
        setJobDescription(stored);
        setIsEditingContext(false);
      }
    } catch {
      // ignore
    }
  }, [sessionId]);

  useEffect(() => {
    try {
      const key = `jdText:${sessionId}`;
      if (jobDescription.trim().length === 0) {
        window.localStorage.removeItem(key);
      } else {
        window.localStorage.setItem(key, jobDescription);
      }
    } catch {
      // ignore
    }
  }, [jobDescription, sessionId]);

  useEffect(() => {
    let active = true;
    let timeout: NodeJS.Timeout;

    async function poll() {
      try {
        const response = await fetch(`/api/sessions/${sessionId}/compare`, { cache: "no-store" });
        if (response.status === 401) { window.location.href = "/login"; return; }
        if (!response.ok) {
          const body = await response.json();
          throw new Error(body.error || "Failed to load comparison.");
        }
        const payload = (await response.json()) as ComparisonResponse;
        if (!active) return;
        setData(payload);
        setError(null);
        if (payload.status !== "COMPLETED") {
          timeout = setTimeout(poll, 3000);
        }
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unexpected error.");
      }
    }

    poll();
    return () => { active = false; if (timeout) clearTimeout(timeout); };
  }, [sessionId, retryCount]);

  useEffect(() => {
    let active = true;
    async function loadHiringUi() {
      if (data?.documents && data.documents.length > 2) { setHiringUi(null); return; }
      try {
        const jd = jobDescription.trim();
        const response = jd.length > 0
          ? await fetch(`/api/sessions/${sessionId}/hiring-ui?lens=hiring`, {
              method: "POST", cache: "no-store",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ jdText: jd })
            })
          : await fetch(`/api/sessions/${sessionId}/hiring-ui?lens=hiring`, { cache: "no-store" });
        if (response.status === 401) { window.location.href = "/login"; return; }
        if (!response.ok) { setHiringUi(null); return; }
        const payload = (await response.json()) as HiringUiResponse;
        if (!active) return;
        setHiringUi(payload);
      } catch { setHiringUi(null); }
    }
    loadHiringUi();
    return () => { active = false; };
  }, [sessionId, jobDescription, data?.documents]);

  useEffect(() => {
    let active = true;
    async function loadRank() {
      if (!data?.documents || data.documents.length <= 2) { setRankUi(null); return; }
      try {
        const contextText = jobDescription.trim();
        const url = `/api/sessions/${sessionId}/rank?lens=${lens}`;
        const response = contextText.length > 0
          ? await fetch(url, {
              method: "POST", cache: "no-store",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ contextText })
            })
          : await fetch(url, { cache: "no-store" });
        if (response.status === 401) { window.location.href = "/login"; return; }
        if (!response.ok) { setRankUi(null); return; }
        const payload = (await response.json()) as RankResponse;
        if (!active) return;
        setRankUi(payload);
        setSelectedDocIds((prev) => prev.length === 2 ? prev : payload.ranked.slice(0, 2).map((d) => d.id));
      } catch { setRankUi(null); }
    }
    loadRank();
    return () => { active = false; };
  }, [data?.documents, jobDescription, lens, sessionId]);

  async function handleExportExcel() {
    setExportError(null);
    setIsExporting(true);
    try {
      const queryParts: string[] = [`lens=${lens}`];
      if (data?.documents && data.documents.length > 2 && selectedDocIds.length === 2) {
        queryParts.push(`docIds=${encodeURIComponent(selectedDocIds.join(","))}`);
      }
      const query = `?${queryParts.join("&")}`;
      const exportUrl = `/api/sessions/${sessionId}/export-xlsx${query}`;
      const jd = jobDescription.trim();
      const response = jd.length > 0
        ? await fetch(exportUrl, {
            method: "POST", cache: "no-store",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jdText: jd })
          })
        : await fetch(exportUrl, { cache: "no-store" });
      if (response.status === 401) { window.location.href = "/login"; return; }
      if (!response.ok) {
        const bodyJson = (await response.json().catch(() => null)) as { error?: string } | null;
        if (bodyJson?.error) { setExportError(bodyJson.error); return; }
        const bodyText = await response.text().catch(() => "");
        setExportError(`Export failed (HTTP ${response.status}). ${bodyText.trim().slice(0, 220)}`);
        return;
      }
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `resume-comparison-${sessionId}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "Export failed unexpectedly.");
    } finally {
      setIsExporting(false);
    }
  }

  const evidenceSnippet = (value: string) => {
    const cleaned = value
      .replace(/^\s*-\s*/gm, "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 2)
      .join(" \u2022 ");
    return cleaned.length > 0 ? cleaned : "No concrete evidence found in resume.";
  };

  const asBullets = (text: string) => {
    const lines = text.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => line.replace(/^[-\u2022]\s*/, ""));
    return lines.length > 1 ? lines : null;
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Resume comparison</h1>
          <p className="mt-1 text-sm text-slate-600">
            {data?.documents && data.documents.length > 2
              ? "Ranked shortlist of all candidates."
              : "Side-by-side hiring dashboard."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
            onClick={handleExportExcel}
            disabled={isExporting}
          >
            {isExporting ? "Exporting..." : "Export decision Excel"}
          </button>
          <a
            className="rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            href={`/api/sessions/${sessionId}/export`}
          >
            Export raw CSV
          </a>
        </div>
      </div>

      {/* Job Description Context */}
      <div className="rounded border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">Job Description</div>
            <div className="mt-1 text-xs text-slate-500">
              Paste a real JD (5+ words) to get keyword-aligned fit scores and interview questions.
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              onClick={() => setIsEditingContext((v) => !v)}
            >
              {isEditingContext ? "Hide editor" : "Edit JD"}
            </button>
            {jobDescription.trim().length > 0 ? (
              <button
                type="button"
                className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                onClick={() => setJobDescription("")}
              >
                Clear
              </button>
            ) : null}
          </div>
        </div>

        {!isEditingContext ? (
          <div className="mt-3 text-sm text-slate-700">
            {jobDescription.trim().length > 0
              ? `${jobDescription.trim().slice(0, 180)}${jobDescription.trim().length > 180 ? "\u2026" : ""}`
              : "No job description provided yet. Paste a JD for better candidate fit analysis."}
          </div>
        ) : (
          <>
            <textarea
              className="mt-3 w-full resize-y rounded border border-slate-300 px-3 py-2 text-sm text-slate-800"
              rows={5}
              value={jobDescription}
              placeholder="Paste job description here (key requirements, skills, responsibilities). Minimum 5 words for meaningful analysis."
              onChange={(e) => setJobDescription(e.target.value)}
            />
            <div className="mt-2 text-xs text-slate-500">
              Tip: Paste the "must have" requirements. Short/vague input like "Test" will be ignored.
            </div>
          </>
        )}
      </div>

      {/* JD Fit Snapshot (only when JD is meaningful) */}
      {hiringUi?.jdContext && hiringUi.jdContext.jdProvided ? (
        <div className="rounded border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold text-slate-900">
            JD fit snapshot
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Based on keyword alignment from pasted JD (top {hiringUi.jdContext.keywordCount} terms).
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {hiringUi.jdContext.candidates.slice(0, 2).map((c) => (
              <div key={c.filename} className="rounded border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{c.candidateName}</div>
                    <div className="mt-1 text-xs text-slate-500">{c.filename}</div>
                  </div>
                  <div className={`text-sm font-semibold ${contextFitColor(c.matchPercent)}`}>
                    {c.matchPercent}% fit
                  </div>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-slate-100">
                  <div
                    className={`h-2 rounded-full ${c.matchPercent >= 70 ? "bg-emerald-500" : c.matchPercent >= 40 ? "bg-amber-400" : "bg-red-400"}`}
                    style={{ width: `${Math.min(100, Math.max(0, c.matchPercent))}%` }}
                  />
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Matches</div>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                      {(c.matched.length > 0 ? c.matched : ["No strong matches surfaced."]).map((k) => (
                        <li key={k}>{k}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-red-600">Missing</div>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                      {(c.missing.length > 0 ? c.missing : ["No major gaps detected."]).map((k) => (
                        <li key={k}>{k}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div className="rounded border border-emerald-200 bg-emerald-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Why the winner wins</div>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                {hiringUi.jdContext.defensibility.whyWinnerWins.map((b) => <li key={b}>{b}</li>)}
              </ul>
            </div>
            <div className="rounded border border-amber-200 bg-amber-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">What would flip the decision</div>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                {hiringUi.jdContext.defensibility.whatWouldFlip.map((b) => <li key={b}>{b}</li>)}
              </ul>
            </div>
            <div className="rounded border border-blue-200 bg-blue-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-blue-700">Verify in interview</div>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                {hiringUi.jdContext.defensibility.verifyInInterview.map((q) => <li key={q}>{q}</li>)}
              </ul>
            </div>
          </div>
        </div>
      ) : null}

      {exportError ? (
        <div className="rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{exportError}</div>
      ) : null}

      {error ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <div>
            <div className="font-semibold">We hit a data issue.</div>
            <div className="text-amber-800">{error}</div>
          </div>
          <button
            type="button"
            className="rounded border border-amber-300 bg-white px-3 py-1 text-sm font-medium text-amber-900 hover:bg-amber-100"
            onClick={() => setRetryCount((c) => c + 1)}
          >
            Retry
          </button>
        </div>
      ) : null}

      {!data ? (
        <div className="rounded border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Loading comparison data...
        </div>
      ) : (
        <div className="flex flex-col gap-6">

          {/* ─── Multi-doc ranking (3+ resumes) ─── */}
          {rankUi && data.documents.length > 2 ? (
            <div className="rounded border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Candidate ranking
                  </div>
                  <div className="mt-1 text-2xl font-semibold text-slate-900">
                    Top pick: {rankUi.ranked[0]?.filename ?? "Pending"}
                  </div>
                  <div className="mt-2 text-sm text-slate-700">
                    {rankUi.documentCount} resumes compared
                    {rankUi.contextUsed && rankUi.contextKeywords.length > 0
                      ? ` \u00b7 JD keywords: ${rankUi.contextKeywords.slice(0, 6).join(", ")}`
                      : ""}
                    {!rankUi.contextUsed && " \u00b7 No JD provided \u2014 ranking based on resume quality only"}
                  </div>
                </div>
                <div className="rounded border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  Select exactly <span className="font-semibold">2</span> candidates to export the Excel decision file.
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
                    {rankUi.ranked.map((doc) => {
                      const checked = selectedDocIds.includes(doc.id);
                      return (
                        <tr key={doc.id} className="border-b border-slate-100 align-top">
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                setSelectedDocIds((prev) => {
                                  if (prev.includes(doc.id)) return prev.filter((id) => id !== doc.id);
                                  if (prev.length >= 2) return [prev[1], doc.id];
                                  return [...prev, doc.id];
                                });
                              }}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full font-semibold text-white ${doc.rank === 1 ? "bg-emerald-600" : doc.rank === 2 ? "bg-teal-500" : "bg-slate-400"}`}>
                              #{doc.rank}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            <div className="font-semibold">{doc.filename}</div>
                            <div className="mt-1 flex gap-2 text-xs">
                              <span className={`rounded px-1.5 py-0.5 font-medium ${scoreTextColor(doc.clarity)}`}>
                                Clarity {doc.clarity}/5
                              </span>
                              <span className={`rounded px-1.5 py-0.5 font-medium ${scoreTextColor(doc.riskHygiene)}`}>
                                Risk hygiene {doc.riskHygiene}/5
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-lg font-bold text-slate-900">{doc.total}</span>
                            <span className="text-xs text-slate-500"> / 30</span>
                          </td>
                          {rankUi.contextUsed && (
                            <td className="px-4 py-3 text-slate-700">
                              <div className={`text-lg font-semibold ${contextFitColor(doc.contextFitPercent)}`}>
                                {doc.contextFitPercent}%
                              </div>
                              {doc.missingKeywords.length > 0 && (
                                <div className="mt-1 text-xs text-red-600">
                                  Missing: {doc.missingKeywords.slice(0, 3).join(", ")}
                                </div>
                              )}
                            </td>
                          )}
                          <td className="px-4 py-3">
                            <div className="grid gap-2">
                              {doc.dimensions.map((d) => (
                                <div key={d.dimension} className="rounded border border-slate-200 p-2">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="font-semibold text-slate-700">{d.dimension}</span>
                                    <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${scoreTextColor(d.score)}`}>
                                      {d.score}/5 {scoreLabel(d.score)}
                                    </span>
                                  </div>
                                  <div className="mt-1 h-2 w-full rounded-full bg-slate-100">
                                    <div className={`h-2 rounded-full ${scoreBarColor(d.score)}`} style={{ width: `${d.score * 20}%` }} />
                                  </div>
                                  {d.scoreReason && (
                                    <div className="mt-1.5 text-xs text-slate-600 italic">{d.scoreReason}</div>
                                  )}
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
                                    <div key={`${doc.id}-${r.riskType}`} className={`rounded border p-2 ${riskBadge(r.level).split(" ").slice(0, 1).join("")} bg-opacity-30`}>
                                      <div className="flex items-center justify-between">
                                        <div className="font-semibold text-slate-900">{r.riskType}</div>
                                        <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${riskBadge(r.level)}`}>{r.level}</span>
                                      </div>
                                      <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-700">
                                        {r.bullets.map((b) => <li key={b}>{b}</li>)}
                                      </ul>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Verify in interview</div>
                                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-700">
                                  {doc.interviewKit.verifyQuestions.slice(0, 2).map((q) => <li key={q}>{q}</li>)}
                                </ul>
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 text-xs text-slate-500">
                Note: Select 2 candidates above for the detailed side-by-side Excel export.
              </div>
            </div>
          ) : null}

          {/* ─── 2-doc hiring dashboard ─── */}
          {data.documents.length <= 2 ? (
            <div className="rounded border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">View</div>
                  <div className="mt-1 flex gap-2">
                    <button
                      type="button"
                      className={hiringView === "dashboard"
                        ? "rounded bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white"
                        : "rounded border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"}
                      onClick={() => setHiringView("dashboard")}
                    >
                      Hiring dashboard
                    </button>
                    <button
                      type="button"
                      className={hiringView === "attributes"
                        ? "rounded bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white"
                        : "rounded border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"}
                      onClick={() => setHiringView("attributes")}
                    >
                      Raw attributes
                    </button>
                  </div>
                </div>
              </div>

              {hiringView === "dashboard" ? (
                !hiringUi ? (
                  <div className="mt-5 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    Loading hiring dashboard... If this persists, switch to "Raw attributes" to confirm extraction.
                  </div>
                ) : (
                  (() => {
                    const candidate1 = hiringUi.candidates[0];
                    const candidate2 = hiringUi.candidates[1];
                    const candidate1Label = candidate1?.candidateName || candidate1?.filename || "Candidate 1";
                    const candidate2Label = candidate2?.candidateName || candidate2?.filename || "Candidate 2";
                    const total1 = hiringUi.verdict.totals[candidate1?.filename ?? ""] ?? 0;
                    const total2 = hiringUi.verdict.totals[candidate2?.filename ?? ""] ?? 0;
                    const maxTotal = Math.max(total1, total2, 1);

                    return (
                      <>
                        {/* Final Recommendation */}
                        <div className="mt-5 rounded-lg border-2 border-emerald-200 bg-emerald-50 p-5">
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                              <div className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                                Recommended candidate
                              </div>
                              <div className="mt-1 text-2xl font-semibold text-slate-900">
                                {hiringUi.verdict.winnerCandidateName}
                              </div>
                              <div className="mt-1 text-sm text-slate-600">
                                Based on: {hiringUi.verdict.winnerFilename}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-sm font-semibold text-slate-700">Confidence:</div>
                              <span className={
                                hiringUi.verdict.confidence === "High"
                                  ? "rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800 border border-emerald-300"
                                  : hiringUi.verdict.confidence === "Medium"
                                    ? "rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800 border border-amber-300"
                                    : "rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-800 border border-red-300"
                              }>
                                {hiringUi.verdict.confidence}
                              </span>
                            </div>
                          </div>
                          <div className="mt-3 text-sm text-slate-700">{hiringUi.verdict.rationale}</div>
                        </div>

                        {/* Score snapshot */}
                        <div className="mt-5 rounded border border-slate-200 p-4">
                          <div className="text-sm font-semibold text-slate-900">Overall score comparison</div>
                          <div className="mt-3 grid gap-3 md:grid-cols-2">
                            {[
                              { label: candidate1Label, file: candidate1?.filename, total: total1 },
                              { label: candidate2Label, file: candidate2?.filename, total: total2 }
                            ].map((c) => {
                              const isWinner = hiringUi.verdict.winnerFilename === c.file;
                              return (
                                <div key={c.label}>
                                  <div className="flex items-center justify-between text-xs text-slate-500">
                                    <span className="font-medium">{c.label} {isWinner && <span className="text-emerald-600">(Recommended)</span>}</span>
                                    <span className="font-semibold text-slate-900">{c.total}/30</span>
                                  </div>
                                  <div className="mt-1 h-3 w-full rounded-full bg-slate-100">
                                    <div
                                      className={`h-3 rounded-full ${isWinner ? "bg-emerald-500" : "bg-slate-400"}`}
                                      style={{ width: `${Math.round((c.total / maxTotal) * 100)}%` }}
                                    />
                                  </div>
                                  <div className="mt-1 text-xs text-slate-500">{c.file}</div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Dimension-by-dimension table */}
                        <div className="mt-6 rounded border border-slate-200">
                          <table className="w-full table-fixed border-collapse text-left text-sm">
                            <thead className="bg-slate-50">
                              <tr className="border-b border-slate-200">
                                <th className="w-[160px] px-4 py-3 font-semibold text-slate-700">Dimension</th>
                                <th className="w-[200px] px-4 py-3 font-semibold text-slate-700">
                                  Score comparison
                                  <div className="mt-1 text-xs font-normal text-slate-500">{candidate1Label} vs {candidate2Label}</div>
                                </th>
                                <th className="w-[340px] px-4 py-3 font-semibold text-slate-700">Evidence (key signals)</th>
                                <th className="px-4 py-3 font-semibold text-slate-700">Why this matters</th>
                              </tr>
                            </thead>
                            <tbody>
                              {hiringUi.dimensions.map((row) => {
                                const aPct = row.aScore * 20;
                                const bPct = row.bScore * 20;
                                return (
                                  <tr key={row.dimension} className="border-b border-slate-100 align-top">
                                    <td className="px-4 py-3 font-semibold text-slate-900">{row.dimension}</td>
                                    <td className="px-4 py-3">
                                      <div className="grid gap-2">
                                        <div>
                                          <div className="flex items-center justify-between text-xs text-slate-500">
                                            <span>{candidate1Label}</span>
                                            <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${scoreTextColor(row.aScore)}`}>
                                              {row.aScore}/5
                                            </span>
                                          </div>
                                          <div className="mt-1 h-2 w-full rounded-full bg-slate-100">
                                            <div className={`h-2 rounded-full ${scoreBarColor(row.aScore)}`} style={{ width: `${aPct}%` }} />
                                          </div>
                                        </div>
                                        <div>
                                          <div className="flex items-center justify-between text-xs text-slate-500">
                                            <span>{candidate2Label}</span>
                                            <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${scoreTextColor(row.bScore)}`}>
                                              {row.bScore}/5
                                            </span>
                                          </div>
                                          <div className="mt-1 h-2 w-full rounded-full bg-slate-100">
                                            <div className={`h-2 rounded-full ${scoreBarColor(row.bScore)}`} style={{ width: `${bPct}%` }} />
                                          </div>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 align-top">
                                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{candidate1Label}</div>
                                      <div className="mt-1 text-sm text-slate-700 break-words whitespace-normal">
                                        {evidenceSnippet(row.aEvidence)}
                                      </div>
                                      <div className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{candidate2Label}</div>
                                      <div className="mt-1 text-sm text-slate-700 break-words whitespace-normal">
                                        {evidenceSnippet(row.bEvidence)}
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 text-slate-700 align-top break-words whitespace-normal">
                                      <div className="space-y-3">
                                        <div>
                                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Why this matters</div>
                                          <div className="mt-1 text-sm text-slate-700">
                                            {(() => {
                                              const bullets = asBullets(row.whyThisMatters);
                                              if (!bullets) return row.whyThisMatters;
                                              return (
                                                <ul className="list-disc space-y-1 pl-5">
                                                  {bullets.map((b) => <li key={b}>{b}</li>)}
                                                </ul>
                                              );
                                            })()}
                                          </div>
                                        </div>
                                        <div>
                                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Decision impact</div>
                                          <div className="mt-1 text-sm font-semibold text-slate-900">
                                            {(() => {
                                              const bullets = asBullets(row.decisionImpact);
                                              if (!bullets) return row.decisionImpact;
                                              return (
                                                <ul className="list-disc space-y-1 pl-5 font-semibold">
                                                  {bullets.map((b) => <li key={b}>{b}</li>)}
                                                </ul>
                                              );
                                            })()}
                                          </div>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Risk Signals */}
                        <div className="mt-6 rounded border border-slate-200 p-4">
                          <div className="text-sm font-semibold text-slate-900">Risk signals (candidate-specific)</div>
                          <div className="mt-3 grid gap-4 md:grid-cols-2">
                            {[candidate1, candidate2].map((candidate) => {
                              const relevant = hiringUi.risks.filter((risk) =>
                                risk.appliesTo === "both" ? true : risk.candidateFilename === candidate?.filename
                              );
                              const label = candidate?.candidateName || candidate?.filename || "Candidate";
                              return (
                                <div key={candidate?.filename || label} className="rounded border border-slate-200 p-4">
                                  <div className="text-sm font-semibold text-slate-900">{label}</div>
                                  <div className="mt-1 text-xs text-slate-500">{candidate?.filename}</div>
                                  <div className="mt-3 space-y-2">
                                    {relevant.slice(0, 4).map((risk) => (
                                      <div key={`${risk.riskType}-${risk.observedSignal}`} className="flex items-start gap-2">
                                        <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${riskBadge(risk.riskLevel)}`}>
                                          {risk.riskLevel}
                                        </span>
                                        <div className="text-sm text-slate-700">
                                          <div className="font-semibold">{risk.riskType}</div>
                                          <ul className="mt-1 list-disc space-y-1 pl-5 text-xs">
                                            {(risk.bullets && risk.bullets.length > 0
                                              ? risk.bullets
                                              : [risk.observedSignal, `Fix: ${risk.recommendation}`]
                                            ).map((b) => <li key={b}>{b}</li>)}
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
                )
              ) : (
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
                          {data.documents.map((doc) => (
                            <th key={doc.id} className="px-3 py-2 font-semibold text-slate-700">{doc.filename}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {data.rows.map((row) => (
                          <tr key={row.key} className="border-b border-slate-100">
                            <td className="px-3 py-2 font-medium text-slate-700">{row.displayName}</td>
                            {data.documents.map((doc) => (
                              <td key={doc.id} className="px-3 py-2 text-slate-600">{row.values[doc.id] || "\u2014"}</td>
                            ))}
                          </tr>
                        ))}
                        {data.rows.length === 0 ? (
                          <tr>
                            <td className="px-3 py-6 text-center text-sm text-slate-500" colSpan={data.documents.length + 1}>
                              Waiting for extraction to complete.
                            </td>
                          </tr>
                        ) : null}
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
