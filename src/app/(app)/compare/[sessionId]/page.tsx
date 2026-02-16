"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { DocumentAnalyzer } from "../../../../components/DocumentAnalyzer";

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
  if (strength === "strong") return "border-emerald-400 bg-gradient-to-br from-emerald-50 to-green-50";
  if (strength === "moderate") return "border-amber-400 bg-gradient-to-br from-amber-50 to-yellow-50";
  if (strength === "weak") return "border-orange-400 bg-gradient-to-br from-orange-50 to-red-50";
  return "border-red-400 bg-gradient-to-br from-red-50 to-pink-50"; // none
}
function strengthIcon(strength: string) {
  if (strength === "strong") {
    return (
      <svg className="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  }
  if (strength === "moderate") {
    return (
      <svg className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    );
  }
  if (strength === "weak") {
    return (
      <svg className="h-6 w-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  }
  return (
    <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
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
  const processTriggeredRef = useRef(false);

  useEffect(() => { setHiringView("dashboard"); }, []);

  // If user lands on compare with PENDING (e.g. shared link), kick off extraction once so polling can eventually see COMPLETED
  useEffect(() => {
    if (!sessionId || !data || data.status !== "PENDING" || data.documents.length < 2 || processTriggeredRef.current) return;
    processTriggeredRef.current = true;
    fetch(`/api/sessions/${sessionId}/process`, { method: "POST" }).catch(() => {});
  }, [sessionId, data?.status, data?.documents?.length]);

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
    if (data?.status !== "COMPLETED" || !data?.documents || data.documents.length > 2) {
      setHiringUi(null);
      return;
    }
    let active = true;
    async function loadHiringUi() {
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
  }, [sessionId, jobDescription, data?.status, data?.documents]);

  useEffect(() => {
    if (!sessionId) return;
    // Only load rank after extraction is complete so we don't show "No strong candidates" from partial data
    if (data?.status !== "COMPLETED" || !data?.documents || data.documents.length <= 2) {
      setRankUi(null);
      return;
    }
    let active = true;
    async function loadRank() {
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
  }, [data?.status, data?.documents, jobDescription, lens, sessionId]);

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

  const hasJd = jobDescription.trim().split(/\s+/).filter((w) => w.length >= 2).length >= 2;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="animate-fade-in">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Resume Comparison</h1>
          <p className="mt-2 text-sm text-slate-600 sm:text-base">
            {data?.documents && data.documents.length > 2 ? "🎯 All uploaded candidates ranked and analyzed" : "⚖️ Side-by-side candidate comparison"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <button 
            type="button" 
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 transition-all hover:shadow-xl hover:shadow-indigo-500/40 disabled:cursor-not-allowed disabled:opacity-60" 
            onClick={handleExportExcel} 
            disabled={isExporting}
          >
            {isExporting ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Exporting...</span>
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Export Excel</span>
              </>
            )}
          </button>
          <a 
            className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:shadow-md" 
            href={`/api/sessions/${sessionId}/export`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="hidden sm:inline">Export CSV</span>
            <span className="sm:hidden">CSV</span>
          </a>
        </div>
      </div>

      {/* No-JD Warning */}
      {!hasJd && (
        <div className="animate-fade-in rounded-xl border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-indigo-50 p-5 shadow-soft">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100">
              <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="font-bold text-blue-900">No job description provided</div>
              <div className="mt-1 text-sm text-blue-800">
                Results compare <strong>resume quality only</strong> (structure, metrics, ownership) — not job fit.
                Add a job description below for better insights.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Job Description Context */}
      <div className="animate-fade-in overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-slate-50 to-slate-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100">
              <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900">Job Description</div>
              <div className="mt-0.5 text-xs text-slate-600">
                {jobDescription.trim().length > 0 
                  ? `${jobDescription.trim().length} characters • Click Edit to modify` 
                  : "Add for keyword-aligned fit scores"}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              type="button" 
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50" 
              onClick={() => setIsEditingContext((v) => !v)}
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              {isEditingContext ? "Done" : "Edit"}
            </button>
            {jobDescription.trim().length > 0 && (
              <button 
                type="button" 
                className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-red-50 hover:border-red-300 hover:text-red-700" 
                onClick={() => setJobDescription("")}
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Clear
              </button>
            )}
          </div>
        </div>
        {!isEditingContext ? (
          <div className="px-5 py-4">
            <p className="text-sm text-slate-700">
              {jobDescription.trim().length > 0 ? (
                <span>{jobDescription.trim().slice(0, 280)}{jobDescription.trim().length > 280 ? "..." : ""}</span>
              ) : (
                <span className="italic text-slate-500">No job description provided yet. Click Edit to add one.</span>
              )}
            </p>
          </div>
        ) : (
          <div className="border-t border-slate-200 bg-slate-50 px-5 py-4">
            <textarea 
              className="w-full resize-y rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 transition-all placeholder:text-slate-400 hover:border-indigo-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10" 
              rows={6} 
              value={jobDescription} 
              placeholder="Paste the full job description here (requirements, skills, responsibilities). Minimum 3 words for analysis." 
              onChange={(e) => setJobDescription(e.target.value)} 
            />
            <div className="mt-3 flex items-start gap-2 text-xs text-slate-600">
              <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>The more detailed your JD, the better the keyword matching and interview questions will be.</span>
            </div>
          </div>
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
          {data.documents.length > 2 && data.status !== "COMPLETED" ? (
            <div className="animate-fade-in">
              <DocumentAnalyzer
                title="Analyzing resumes"
                subtitle="Usually 15–30 seconds. Ranking and recommendation will appear when complete."
              />
            </div>
          ) : rankUi && data.documents.length > 2 ? (
            <div className="animate-fade-in rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
              {/* Recommendation Banner */}
              <div className={`rounded-xl border-2 p-5 mb-6 shadow-soft ${strengthBanner(rankUi.recommendation.strength)}`}>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">{strengthIcon(rankUi.recommendation.strength)}</div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-900">{rankUi.recommendation.headline}</h3>
                    <p className="mt-2 text-sm text-slate-700 leading-relaxed">{rankUi.recommendation.subtext}</p>
                    {rankUi.recommendation.strength !== "none" && rankUi.ranked[0] && (
                      <div className="mt-4 flex items-center gap-2 rounded-lg bg-white/60 px-3 py-2 backdrop-blur-sm">
                        <svg className="h-4 w-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="text-sm font-medium text-slate-700">
                          {rankUi.recommendation.strength === "strong" ? "Top candidate: " : "Leading by structure: "}
                          <span className="font-bold text-slate-900">{rankUi.ranked[0].filename}</span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100">
                    <span className="text-lg">📊</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      {rankUi.documentCount} Candidates Analyzed
                    </p>
                    <p className="text-xs text-slate-600">
                      {rankUi.contextUsed ? `JD Keywords: ${rankUi.contextKeywords.slice(0, 4).join(", ")}${rankUi.contextKeywords.length > 4 ? "..." : ""}` : "Resume quality comparison (no JD provided)"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm">
                  <svg className="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <span className="font-semibold text-indigo-900">
                    Select <span className="text-indigo-600">2</span> for Excel export
                  </span>
                </div>
              </div>

              <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="bg-gradient-to-r from-slate-50 to-slate-100">
                    <tr className="border-b border-slate-200">
                      <th className="px-4 py-3 font-bold text-slate-700">Select</th>
                      <th className="px-4 py-3 font-bold text-slate-700">Rank</th>
                      <th className="px-4 py-3 font-bold text-slate-700">Candidate</th>
                      <th className="px-4 py-3 font-bold text-slate-700">Total</th>
                      {rankUi.contextUsed && <th className="px-4 py-3 font-bold text-slate-700">JD Fit</th>}
                      <th className="px-4 py-3 font-bold text-slate-700">Dimensions</th>
                      <th className="px-4 py-3 font-bold text-slate-700">Risks & Interview</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankUi.ranked.map((doc, idx) => (
                      <tr key={doc.id} className={`border-b border-slate-100 align-top transition-colors hover:bg-slate-50 ${idx === 0 ? 'bg-indigo-50/30' : ''}`}>
                        <td className="px-4 py-4">
                          <input 
                            type="checkbox" 
                            checked={selectedDocIds.includes(doc.id)} 
                            onChange={() => setSelectedDocIds((prev) => {
                              if (prev.includes(doc.id)) return prev.filter((id) => id !== doc.id);
                              if (prev.length >= 2) return [prev[1], doc.id];
                              return [...prev, doc.id];
                            })} 
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-0"
                          />
                        </td>
                        <td className="px-4 py-4">
                          <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl font-bold text-white shadow-sm ${doc.rank === 1 ? "bg-gradient-to-br from-emerald-500 to-green-600" : doc.rank === 2 ? "bg-gradient-to-br from-teal-500 to-cyan-600" : "bg-gradient-to-br from-slate-400 to-slate-500"}`}>
                            #{doc.rank}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-bold text-slate-900">{doc.filename}</div>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold ${scoreTextColor(doc.clarity)}`}>
                              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Clarity {doc.clarity}/5
                            </span>
                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold ${scoreTextColor(doc.riskHygiene)}`}>
                              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Hygiene {doc.riskHygiene}/5
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-col items-center">
                            <span className="text-2xl font-bold text-slate-900">{doc.total}</span>
                            <span className="text-xs font-medium text-slate-500">out of 30</span>
                          </div>
                        </td>
                        {rankUi.contextUsed && (
                          <td className="px-4 py-4">
                            <div className="flex flex-col items-center">
                              <div className={`text-2xl font-bold ${contextFitColor(doc.contextFitPercent)}`}>{doc.contextFitPercent}%</div>
                              {doc.matchedKeywords.length > 0 && (
                                <div className="mt-2 text-xs text-slate-600">
                                  ✓ {doc.matchedKeywords.slice(0, 2).join(", ")}
                                </div>
                              )}
                              {doc.missingKeywords.length > 0 && (
                                <div className="mt-1 text-xs text-red-600">
                                  ✗ {doc.missingKeywords.slice(0, 2).join(", ")}
                                </div>
                              )}
                            </div>
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
              {data.status !== "COMPLETED" ? (
                <DocumentAnalyzer
                  compact
                  title="Analyzing resumes"
                  subtitle="Usually 15–30 seconds. Comparison will appear when complete."
                />
              ) : (
                <>
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
                </>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
