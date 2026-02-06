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
    dimensions: { dimension: string; score: number; evidenceSnippet: string }[];
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
    | {
        jdProvided: false;
      }
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

export default function ComparePage({
  params
}: {
  params: { sessionId: string };
}) {
  const { sessionId } = params;
  const [data, setData] = useState<ComparisonResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [lens, setLens] = useState<"auto" | "hiring" | "rfp" | "sales">("auto");
  const [exportError, setExportError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [hiringUi, setHiringUi] = useState<HiringUiResponse | null>(null);
  const [rankUi, setRankUi] = useState<RankResponse | null>(null);
  const [hiringView, setHiringView] = useState<"dashboard" | "attributes">(
    "dashboard"
  );
  const [jobDescription, setJobDescription] = useState<string>("");
  const [isEditingContext, setIsEditingContext] = useState(false);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);

  const looksLikeHiring = useMemo(() => {
    const names = (data?.documents || []).map((d) => d.filename).join(" ");
    return /\b(resume|cv|curriculum vitae|cover\s*letter)\b/i.test(names);
  }, [data?.documents]);

  const verdictMetrics = useMemo(() => {
    if (!data?.verdict) return [];
    return data.verdict.metrics;
  }, [data]);

  // Auto-pick Hiring lens for resume/CV uploads so users see the decision dashboard by default.
  useEffect(() => {
    if (!data) return;
    if (lens !== "auto") return;
    if (!looksLikeHiring) return;
    setLens("hiring");
  }, [data, lens, looksLikeHiring]);

  useEffect(() => {
    if (lens !== "hiring") {
      setHiringView("dashboard");
      return;
    }
    setHiringView("dashboard");
  }, [lens]);

  useEffect(() => {
    // Persist JD per session so recruiters can reuse it.
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
        const response = await fetch(`/api/sessions/${sessionId}/compare`, {
          cache: "no-store"
        });
        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }
        if (!response.ok) {
          const body = await response.json();
          throw new Error(body.error || "Failed to load comparison.");
        }
        const payload = (await response.json()) as ComparisonResponse;
        if (!active) {
          return;
        }
        setData(payload);
        setError(null);
        if (payload.status !== "COMPLETED") {
          timeout = setTimeout(poll, 3000);
        }
      } catch (err) {
        if (!active) {
          return;
        }
        setError(err instanceof Error ? err.message : "Unexpected error.");
      }
    }

    poll();
    return () => {
      active = false;
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [sessionId, retryCount]);

  useEffect(() => {
    let active = true;
    async function loadHiringUi() {
      if (lens !== "hiring") {
        setHiringUi(null);
        return;
      }
      if (data?.documents && data.documents.length > 2) {
        setHiringUi(null);
        return;
      }
      try {
        const jd = jobDescription.trim();
        const response = jd.length > 0
          ? await fetch(`/api/sessions/${sessionId}/hiring-ui?lens=hiring`, {
              method: "POST",
              cache: "no-store",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ jdText: jd })
            })
          : await fetch(`/api/sessions/${sessionId}/hiring-ui?lens=hiring`, {
              cache: "no-store"
            });
        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }
        if (!response.ok) {
          setHiringUi(null);
          return;
        }
        const payload = (await response.json()) as HiringUiResponse;
        if (!active) return;
        setHiringUi(payload);
      } catch {
        setHiringUi(null);
      }
    }
    loadHiringUi();
    return () => {
      active = false;
    };
  }, [lens, sessionId, jobDescription]);

  useEffect(() => {
    let active = true;
    async function loadRank() {
      if (!data?.documents) return;
      if (data.documents.length <= 2) {
        setRankUi(null);
        return;
      }

      try {
        const contextText = jobDescription.trim();
        const lensQuery = lens === "auto" ? "" : `?lens=${lens}`;
        const url = `/api/sessions/${sessionId}/rank${lensQuery}`;
        const response =
          contextText.length > 0
            ? await fetch(url, {
                method: "POST",
                cache: "no-store",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contextText })
              })
            : await fetch(url, { cache: "no-store" });

        if (response.status === 401) {
          window.location.href = "/login";
          return;
        }
        if (!response.ok) {
          setRankUi(null);
          return;
        }

        const payload = (await response.json()) as RankResponse;
        if (!active) return;
        setRankUi(payload);
        setSelectedDocIds((prev) =>
          prev.length === 2 ? prev : payload.ranked.slice(0, 2).map((d) => d.id)
        );
      } catch {
        setRankUi(null);
      }
    }

    loadRank();
    return () => {
      active = false;
    };
  }, [data?.documents, jobDescription, lens, sessionId]);

  async function handleExportExcel() {
    setExportError(null);
    setIsExporting(true);
    try {
      const queryParts: string[] = [];
      if (lens !== "auto") queryParts.push(`lens=${lens}`);
      if (data?.documents && data.documents.length > 2 && selectedDocIds.length === 2) {
        queryParts.push(`docIds=${encodeURIComponent(selectedDocIds.join(","))}`);
      }
      const query = queryParts.length > 0 ? `?${queryParts.join("&")}` : "";
      const exportUrl = `/api/sessions/${sessionId}/export-xlsx${query}`;
      const jd = jobDescription.trim();
      const response =
        jd.length > 0
          ? await fetch(exportUrl, {
              method: "POST",
              cache: "no-store",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ jdText: jd })
            })
          : await fetch(exportUrl, { cache: "no-store" });

      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (!response.ok) {
        const bodyJson = (await response.json().catch(() => null)) as
          | { error?: string; detected?: string; confidence?: number }
          | null;
        if (bodyJson?.error) {
          setExportError(bodyJson.error);
          return;
        }

        const bodyText = await response.text().catch(() => "");
        setExportError(
          `Export failed (HTTP ${response.status}). ${bodyText.trim().slice(0, 220) || "If auto-detection is unsure, pick a lens and retry."}`
        );
        return;
      }

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `decision-compare-${sessionId}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      setExportError(
        err instanceof Error ? err.message : "Export failed unexpectedly."
      );
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Decision dashboard</h1>
          <p className="mt-1 text-sm text-slate-600">
            {data?.documents && data.documents.length > 2
              ? "Ranked shortlist (compares all uploaded documents)."
              : lens === "hiring"
                ? "Hiring Decision dashboard (visual + opinionated)."
                : "Side-by-side comparison (decision-grade)."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            className="rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
            value={lens}
            onChange={(event) => {
              setExportError(null);
              setLens(
                event.target.value as "auto" | "hiring" | "rfp" | "sales"
              );
            }}
          >
            <option value="auto">Auto-detect lens</option>
            <option value="hiring">Hiring decision</option>
            <option value="rfp">RFP / proposal</option>
            <option value="sales">Sales / pitch</option>
          </select>
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

      {lens === "hiring" || lens === "rfp" || lens === "sales" ? (
        <div className="rounded border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">Context</div>
              <div className="mt-1 text-xs text-slate-500">
                Used for ranking, risks, and interview questions. Set it on Upload; edit here if needed.
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                onClick={() => setIsEditingContext((v) => !v)}
              >
                {isEditingContext ? "Hide editor" : "Edit context"}
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
                ? `${jobDescription.trim().slice(0, 180)}${jobDescription.trim().length > 180 ? "…" : ""}`
                : "No context provided yet."}
            </div>
          ) : (
            <>
              <textarea
                className="mt-3 w-full resize-y rounded border border-slate-300 px-3 py-2 text-sm text-slate-800"
                rows={5}
                value={jobDescription}
                placeholder="Paste JD / requirements / buyer brief here."
                onChange={(e) => setJobDescription(e.target.value)}
              />
              <div className="mt-2 text-xs text-slate-500">
                Tip: Paste the “Must have” bullets. Avoid personal data you don’t want stored in your browser.
              </div>
            </>
          )}
        </div>
      ) : null}

      {lens === "hiring" && hiringUi?.jdContext && hiringUi.jdContext.jdProvided ? (
        <div className="rounded border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold text-slate-900">
            JD fit snapshot (recruiter view)
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Based on keyword alignment from pasted JD (top {hiringUi.jdContext.keywordCount} terms).
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {hiringUi.jdContext.candidates.slice(0, 2).map((c) => (
              <div key={c.filename} className="rounded border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      {c.candidateName}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">{c.filename}</div>
                  </div>
                  <div className="text-sm font-semibold text-slate-900">
                    {c.matchPercent}% fit
                  </div>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-emerald-500"
                    style={{ width: `${Math.min(100, Math.max(0, c.matchPercent))}%` }}
                  />
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Matches
                    </div>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                      {(c.matched.length > 0 ? c.matched : ["No strong matches surfaced."]).map((k) => (
                        <li key={k}>{k}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Missing
                    </div>
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
            <div className="rounded border border-slate-200 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Why the winner wins
              </div>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                {hiringUi.jdContext.defensibility.whyWinnerWins.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </div>
            <div className="rounded border border-slate-200 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                What would flip the decision
              </div>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                {hiringUi.jdContext.defensibility.whatWouldFlip.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </div>
            <div className="rounded border border-slate-200 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Verify in interview
              </div>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                {hiringUi.jdContext.defensibility.verifyInInterview.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : null}

      {exportError ? (
        <div className="rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {exportError}
        </div>
      ) : null}

      {error ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <div>
            <div className="font-semibold">We hit a data issue.</div>
            <div className="text-amber-800">
              {error}
            </div>
          </div>
          <button
            type="button"
            className="rounded border border-amber-300 bg-white px-3 py-1 text-sm font-medium text-amber-900 hover:bg-amber-100"
            onClick={() => setRetryCount((count) => count + 1)}
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
          {rankUi && data.documents.length > 2 ? (
            <div className="rounded border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Ranked recommendation (all uploaded documents)
                  </div>
                  <div className="mt-1 text-2xl font-semibold text-slate-900">
                    Top pick: {rankUi.ranked[0]?.filename ?? "Pending"}
                  </div>
                  <div className="mt-2 text-sm text-slate-700">
                    Lens: {rankUi.lens} · Documents: {rankUi.documentCount}
                    {rankUi.contextUsed && rankUi.contextKeywords.length > 0
                      ? ` · Context keywords: ${rankUi.contextKeywords
                          .slice(0, 6)
                          .join(", ")}`
                      : ""}
                  </div>
                </div>
                <div className="rounded border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  Select exactly <span className="font-semibold">2</span> documents below to export the 2‑doc Excel decision file.
                </div>
              </div>

              <div className="mt-5 overflow-x-auto rounded border border-slate-200">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="bg-slate-50">
                    <tr className="border-b border-slate-200">
                      <th className="px-4 py-3 font-semibold text-slate-700">Select</th>
                      <th className="px-4 py-3 font-semibold text-slate-700">Rank</th>
                      <th className="px-4 py-3 font-semibold text-slate-700">Document</th>
                      <th className="px-4 py-3 font-semibold text-slate-700">Total</th>
                      <th className="px-4 py-3 font-semibold text-slate-700">Context fit</th>
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
                                  if (prev.includes(doc.id)) {
                                    return prev.filter((id) => id !== doc.id);
                                  }
                                  if (prev.length >= 2) {
                                    return [prev[1], doc.id];
                                  }
                                  return [...prev, doc.id];
                                });
                              }}
                            />
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-900">#{doc.rank}</td>
                          <td className="px-4 py-3 text-slate-700">
                            <div className="font-semibold">{doc.filename}</div>
                            <div className="mt-1 text-xs text-slate-500">
                              Clarity {doc.clarity}/5 · Risk hygiene {doc.riskHygiene}/5
                            </div>
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-900">{doc.total}</td>
                          <td className="px-4 py-3 text-slate-700">
                            <div className="font-semibold">{doc.contextFitPercent}%</div>
                            <div className="mt-1 text-xs text-slate-500">
                              Missing: {doc.missingKeywords.slice(0, 3).join(", ") || "—"}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="grid gap-2">
                              {doc.dimensions.map((d) => (
                                <div key={d.dimension} className="rounded border border-slate-200 p-2">
                                  <div className="flex items-center justify-between text-xs text-slate-500">
                                    <span className="font-semibold text-slate-700">{d.dimension}</span>
                                    <span className="font-semibold">{d.score}/5</span>
                                  </div>
                                  <div className="mt-1 h-2 w-full rounded-full bg-slate-100">
                                    <div
                                      className="h-2 rounded-full bg-emerald-500"
                                      style={{ width: `${d.score * 20}%` }}
                                    />
                                  </div>
                                  <div className="mt-1 text-xs text-slate-600">{d.evidenceSnippet}</div>
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            <div className="space-y-3">
                              <div>
                                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                  Risks
                                </div>
                                <div className="mt-2 space-y-2">
                                  {doc.risks.slice(0, 2).map((r) => (
                                    <div key={`${doc.id}-${r.riskType}`} className="rounded border border-slate-200 p-2">
                                      <div className="flex items-center justify-between">
                                        <div className="font-semibold">{r.riskType}</div>
                                        <div className="text-xs font-semibold">{r.level}</div>
                                      </div>
                                      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                                        {r.bullets.map((b) => (
                                          <li key={b}>{b}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                  Verify in interview
                                </div>
                                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                                  {doc.interviewKit.verifyQuestions.slice(0, 2).map((q) => (
                                    <li key={q}>{q}</li>
                                  ))}
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
                Note: Detailed 2‑document dashboards + the Excel export still operate on 2 documents. The ranking view compares all uploaded documents.
              </div>
            </div>
          ) : null}

          {lens === "hiring" && data.documents.length <= 2 ? (
            <div className="rounded border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    View
                  </div>
                  <div className="mt-1 flex gap-2">
                    <button
                      type="button"
                      className={
                        hiringView === "dashboard"
                          ? "rounded bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white"
                          : "rounded border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      }
                      onClick={() => setHiringView("dashboard")}
                    >
                      Decision dashboard
                    </button>
                    <button
                      type="button"
                      className={
                        hiringView === "attributes"
                          ? "rounded bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white"
                          : "rounded border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      }
                      onClick={() => setHiringView("attributes")}
                    >
                      Raw attributes
                    </button>
                  </div>
                </div>
                {looksLikeHiring ? (
                  <div className="text-xs text-slate-500">
                    Auto-detected resumes/CVs → showing Hiring dashboard by default.
                  </div>
                ) : null}
              </div>

              {hiringView === "dashboard" ? (
                !hiringUi ? (
                  <div className="mt-5 rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    Hiring dashboard couldn’t load yet. Try again in a few seconds, or switch to “Raw attributes” to confirm extraction.
                  </div>
                ) : (
                  (() => {
                    const candidate1 = hiringUi.candidates[0];
                    const candidate2 = hiringUi.candidates[1];
                    const candidate1Label =
                      candidate1?.candidateName ||
                      candidate1?.filename ||
                      "Candidate 1";
                    const candidate2Label =
                      candidate2?.candidateName ||
                      candidate2?.filename ||
                      "Candidate 2";
                    const total1 =
                      hiringUi.verdict.totals[candidate1?.filename ?? ""] ?? 0;
                    const total2 =
                      hiringUi.verdict.totals[candidate2?.filename ?? ""] ?? 0;
                    const maxTotal = Math.max(total1, total2, 1);
                    const donutTotal = Math.max(total1 + total2, 1);
                    const aRatio = total1 / donutTotal;

                    const evidenceSnippet = (value: string) => {
                      const cleaned = value
                        .replace(/^\s*-\s*/gm, "")
                        .split("\n")
                        .map((line) => line.trim())
                        .filter(Boolean)
                        .slice(0, 2)
                        .join(" • ");
                      return cleaned.length > 0
                        ? cleaned
                        : "Missing: no scoped proof provided.";
                    };

                const asBullets = (text: string) => {
                  const lines = text
                    .split("\n")
                    .map((line) => line.trim())
                    .filter(Boolean)
                    .map((line) => line.replace(/^[-•]\s*/, ""));
                  return lines.length > 1 ? lines : null;
                };

                    const verdictIcon = (
                      winner: "A" | "B",
                      a: number,
                      b: number
                    ) => {
                      if (winner === "A") return a - b >= 2 ? "✔" : "▲";
                      return "▼";
                    };

                    const riskBadge = (level: "High" | "Medium" | "Low") => {
                      if (level === "High") return "bg-red-100 text-red-800";
                      if (level === "Medium")
                        return "bg-amber-100 text-amber-800";
                      return "bg-emerald-100 text-emerald-800";
                    };

                    const Donut = () => {
                      const r = 18;
                      const c = 2 * Math.PI * r;
                      const aDash = `${Math.round(c * aRatio)} ${Math.round(
                        c * (1 - aRatio)
                      )}`;
                      return (
                        <svg width="48" height="48" viewBox="0 0 48 48">
                          <circle
                            cx="24"
                            cy="24"
                            r={r}
                            fill="none"
                            stroke="#e2e8f0"
                            strokeWidth="8"
                          />
                          <circle
                            cx="24"
                            cy="24"
                            r={r}
                            fill="none"
                            stroke="#10b981"
                            strokeWidth="8"
                            strokeDasharray={aDash}
                            strokeLinecap="round"
                            transform="rotate(-90 24 24)"
                          />
                          <circle
                            cx="24"
                            cy="24"
                            r="12"
                            fill="white"
                          />
                        </svg>
                      );
                    };

                    return (
                      <>
                        <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Final Recommendation
                            </div>
                            <div className="mt-1 text-2xl font-semibold text-slate-900">
                              Final Recommendation:{" "}
                              {hiringUi.verdict.winnerCandidateName}
                            </div>
                            <div className="mt-1 text-sm text-slate-600">
                              Based on: {hiringUi.verdict.winnerFilename}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-3 rounded border border-slate-200 bg-white px-3 py-2">
                              <Donut />
                              <div>
                                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                  Score share
                                </div>
                                <div className="mt-1 text-sm text-slate-700">
                                  {candidate1Label}:{" "}
                                  <span className="font-semibold">{total1}</span>{" "}
                                  · {candidate2Label}:{" "}
                                  <span className="font-semibold">{total2}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-sm font-semibold text-slate-700">
                                Confidence:
                              </div>
                              <span
                                className={
                                  hiringUi.verdict.confidence === "High"
                                    ? "rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800"
                                    : hiringUi.verdict.confidence === "Medium"
                                      ? "rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800"
                                      : "rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-800"
                                }
                              >
                                {hiringUi.verdict.confidence}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 text-sm text-slate-700">
                          {hiringUi.verdict.rationale}
                        </div>

                        <div className="mt-5 rounded border border-slate-200 p-4">
                          <div className="text-sm font-semibold text-slate-900">
                            Overall score snapshot
                          </div>
                          <div className="mt-3 grid gap-3 md:grid-cols-2">
                            <div>
                              <div className="flex items-center justify-between text-xs text-slate-500">
                                <span>{candidate1Label}</span>
                                <span>{total1}</span>
                              </div>
                              <div className="mt-1 h-3 w-full rounded-full bg-slate-100">
                                <div
                                  className={`h-3 rounded-full ${hiringUi.verdict.winnerFilename === candidate1?.filename ? "bg-emerald-500" : "bg-slate-400"}`}
                                  style={{
                                    width: `${Math.round(
                                      (total1 / maxTotal) * 100
                                    )}%`
                                  }}
                                />
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                {candidate1?.filename}
                              </div>
                            </div>
                            <div>
                              <div className="flex items-center justify-between text-xs text-slate-500">
                                <span>{candidate2Label}</span>
                                <span>{total2}</span>
                              </div>
                              <div className="mt-1 h-3 w-full rounded-full bg-slate-100">
                                <div
                                  className={`h-3 rounded-full ${hiringUi.verdict.winnerFilename === candidate2?.filename ? "bg-emerald-500" : "bg-slate-400"}`}
                                  style={{
                                    width: `${Math.round(
                                      (total2 / maxTotal) * 100
                                    )}%`
                                  }}
                                />
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                {candidate2?.filename}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-6 rounded border border-slate-200">
                          <table className="w-full table-fixed border-collapse text-left text-sm">
                            <thead className="bg-slate-50">
                              <tr className="border-b border-slate-200">
                                <th className="w-[170px] px-4 py-3 font-semibold text-slate-700">
                                  Decision Dimension
                                </th>
                                <th className="w-[260px] px-4 py-3 font-semibold text-slate-700">
                                  Side-by-side score bars
                                  <div className="mt-1 text-xs font-normal text-slate-500">
                                    {candidate1Label} vs {candidate2Label}
                                  </div>
                                </th>
                                <th className="w-[360px] px-4 py-3 font-semibold text-slate-700">
                                  Evidence (1–2 lines each)
                                </th>
                                <th className="w-[140px] px-4 py-3 font-semibold text-slate-700">
                                  Verdict
                                </th>
                                <th className="px-4 py-3 font-semibold text-slate-700">
                                  Why + Decision Impact
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {hiringUi.dimensions.map((row) => {
                                const aPct = row.aScore * 20;
                                const bPct = row.bScore * 20;
                                const aWins = row.winner === "A";
                                const bWins = row.winner === "B";
                                return (
                                  <tr
                                    key={row.dimension}
                                    className="border-b border-slate-100 align-top"
                                  >
                                    <td className="px-4 py-3 font-semibold text-slate-900">
                                      {row.dimension}
                                    </td>
                                    <td className="px-4 py-3">
                                      <div className="grid gap-2">
                                        <div>
                                          <div className="flex items-center justify-between text-xs text-slate-500">
                                            <span>{candidate1Label}</span>
                                            <span className="font-medium">
                                              {row.aScore}/5
                                            </span>
                                          </div>
                                          <div className="mt-1 h-2 w-full rounded-full bg-slate-100">
                                            <div
                                              className={`h-2 rounded-full ${aWins ? "bg-emerald-500" : "bg-slate-400"}`}
                                              style={{ width: `${aPct}%` }}
                                            />
                                          </div>
                                        </div>
                                        <div>
                                          <div className="flex items-center justify-between text-xs text-slate-500">
                                            <span>{candidate2Label}</span>
                                            <span className="font-medium">
                                              {row.bScore}/5
                                            </span>
                                          </div>
                                          <div className="mt-1 h-2 w-full rounded-full bg-slate-100">
                                            <div
                                              className={`h-2 rounded-full ${bWins ? "bg-emerald-500" : "bg-slate-400"}`}
                                              style={{ width: `${bPct}%` }}
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 align-top">
                                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        {candidate1Label}
                                      </div>
                                      <div className="mt-1 text-sm text-slate-700 break-words whitespace-normal">
                                        {evidenceSnippet(row.aEvidence)}
                                      </div>
                                      <div className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        {candidate2Label}
                                      </div>
                                      <div className="mt-1 text-sm text-slate-700 break-words whitespace-normal">
                                        {evidenceSnippet(row.bEvidence)}
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 align-top">
                                      <div className="text-lg font-semibold text-slate-700">
                                        {verdictIcon(
                                          row.winner,
                                          row.aScore,
                                          row.bScore
                                        )}
                                      </div>
                                      <div className="mt-1 text-xs text-slate-500">
                                        Winner:{" "}
                                        {row.winner === "A"
                                          ? candidate1Label
                                          : candidate2Label}
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 text-slate-700 align-top break-words whitespace-normal">
                                      <div className="space-y-3">
                                        <div>
                                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                            Why this matters
                                          </div>
                                          <div className="mt-1 text-sm text-slate-700">
                                            {(() => {
                                              const bullets = asBullets(row.whyThisMatters);
                                              if (!bullets) return row.whyThisMatters;
                                              return (
                                                <ul className="list-disc space-y-1 pl-5">
                                                  {bullets.map((b) => (
                                                    <li key={b}>{b}</li>
                                                  ))}
                                                </ul>
                                              );
                                            })()}
                                          </div>
                                        </div>
                                        <div>
                                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                            Key difference
                                          </div>
                                          <div className="mt-1 text-sm text-slate-700">
                                            {row.keyDifference}
                                          </div>
                                        </div>
                                        <div>
                                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                            Decision impact
                                          </div>
                                          <div className="mt-1 text-sm font-semibold text-slate-900">
                                            {(() => {
                                              const bullets = asBullets(row.decisionImpact);
                                              if (!bullets) return row.decisionImpact;
                                              return (
                                                <ul className="list-disc space-y-1 pl-5 font-semibold">
                                                  {bullets.map((b) => (
                                                    <li key={b}>{b}</li>
                                                  ))}
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

                        <div className="mt-6 rounded border border-slate-200 p-4">
                          <div className="text-sm font-semibold text-slate-900">
                            Risk signals (candidate-specific)
                          </div>
                          <div className="mt-3 grid gap-4 md:grid-cols-2">
                            {[candidate1, candidate2].map((candidate) => {
                              const relevant = hiringUi.risks.filter((risk) =>
                                risk.appliesTo === "both"
                                  ? true
                                  : risk.candidateFilename === candidate?.filename
                              );
                              const label =
                                candidate?.candidateName ||
                                candidate?.filename ||
                                "Candidate";
                              return (
                                <div
                                  key={candidate?.filename || label}
                                  className="rounded border border-slate-200 p-4"
                                >
                                  <div className="text-sm font-semibold text-slate-900">
                                    {label}
                                  </div>
                                  <div className="mt-1 text-xs text-slate-500">
                                    {candidate?.filename}
                                  </div>
                                  <div className="mt-3 space-y-2">
                                    {relevant.slice(0, 4).map((risk) => (
                                      <div
                                        key={`${risk.riskType}-${risk.observedSignal}`}
                                        className="flex items-start gap-2"
                                      >
                                        <span
                                          className={`rounded px-2 py-0.5 text-xs font-semibold ${riskBadge(
                                            risk.riskLevel
                                          )}`}
                                        >
                                          {risk.riskLevel}
                                        </span>
                                        <div className="text-sm text-slate-700">
                                          <div className="font-semibold">
                                            {risk.riskType}
                                          </div>
                                          <ul className="mt-1 list-disc space-y-1 pl-5">
                                            {(risk.bullets && risk.bullets.length > 0
                                              ? risk.bullets
                                              : [risk.observedSignal, `Fix: ${risk.recommendation}`]
                                            ).map((b) => (
                                              <li key={b}>{b}</li>
                                            ))}
                                          </ul>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          <div className="mt-3 text-xs text-slate-500">
                            Notes: Some risks may apply to both candidates; those will appear on both sides.
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
                    <div>
                      {data.rows.length === 0
                        ? "Extraction in progress."
                        : `${data.rows.length} attributes compared.`}
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50">
                          <th className="px-3 py-2 font-semibold text-slate-700">
                            Attribute
                          </th>
                          {data.documents.map((doc) => (
                            <th
                              key={doc.id}
                              className="px-3 py-2 font-semibold text-slate-700"
                            >
                              {doc.filename}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {data.rows.map((row) => (
                          <tr key={row.key} className="border-b border-slate-100">
                            <td className="px-3 py-2 font-medium text-slate-700">
                              {row.displayName}
                            </td>
                            {data.documents.map((doc) => (
                              <td key={doc.id} className="px-3 py-2 text-slate-600">
                                {row.values[doc.id] || "—"}
                              </td>
                            ))}
                          </tr>
                        ))}
                        {data.rows.length === 0 ? (
                          <tr>
                            <td
                              className="px-3 py-6 text-center text-sm text-slate-500"
                              colSpan={data.documents.length + 1}
                            >
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

          {lens !== "hiring" && data.verdict ? (
            <div className="rounded border border-slate-900 bg-slate-900 p-6 text-slate-50 shadow-lg">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">Final Verdict Score</h2>
                  <p className="mt-1 text-sm text-slate-300">
                    Judgment-grade scoring based on coverage, numeric strength, and risk.
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-xs uppercase tracking-wide text-slate-400">
                    Top Pick
                  </div>
                  <div className="text-base font-semibold">
                    {data.verdict.recommendation.topDocumentName || "Pending"}
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-4">
                {verdictMetrics.map((metric) => (
                  <div
                    key={metric.key}
                    className="rounded border border-slate-700 bg-slate-800 p-4"
                  >
                    <div className="text-sm text-slate-200">{metric.label}</div>
                    <div className="mt-2 flex items-end justify-between">
                      <div className="text-2xl font-semibold">{metric.score}</div>
                      {metric.key === "riskLevel" ? (
                        <div className="text-xs text-slate-400">lower is better</div>
                      ) : null}
                    </div>
                    <div className="mt-2 h-2 w-full rounded-full bg-slate-700">
                      <div
                        className="h-2 rounded-full bg-emerald-400"
                        style={{ width: `${Math.min(metric.score, 100)}%` }}
                      />
                    </div>
                    <div className="mt-2 text-xs text-slate-300">{metric.detail}</div>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded border border-slate-700 bg-slate-800 p-4">
                <div className="text-sm font-semibold">
                  {data.verdict.recommendation.title}
                </div>
                <div className="mt-1 text-sm text-slate-300">
                  {data.verdict.recommendation.detail}
                </div>
              </div>

              {data.verdict.documentScores.length > 0 ? (
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {data.verdict.documentScores.map((doc) => (
                    <div
                      key={doc.id}
                      className="rounded border border-slate-700 bg-slate-800 p-4"
                    >
                      <div className="text-sm font-semibold">{doc.filename}</div>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="text-2xl font-semibold">{doc.score}</div>
                        <div className="text-xs text-slate-400">overall</div>
                      </div>
                      <div className="mt-3 text-xs text-slate-300">
                        Coverage {doc.completeness} · Numeric {doc.numericPerformance} · Key {doc.keyCoverage}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {lens !== "hiring" ? (
          <div className="rounded border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
              <div>Status: {data.status}</div>
              <div>
                {data.rows.length === 0
                  ? "Extraction in progress."
                  : `${data.rows.length} attributes compared.`}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-3 py-2 font-semibold text-slate-700">
                      Attribute
                    </th>
                    {data.documents.map((doc) => (
                      <th
                        key={doc.id}
                        className="px-3 py-2 font-semibold text-slate-700"
                      >
                        {doc.filename}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row) => (
                    <tr key={row.key} className="border-b border-slate-100">
                      <td className="px-3 py-2 font-medium text-slate-700">
                        {row.displayName}
                      </td>
                      {data.documents.map((doc) => (
                        <td key={doc.id} className="px-3 py-2 text-slate-600">
                          {row.values[doc.id] || "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {data.rows.length === 0 ? (
                    <tr>
                      <td
                        className="px-3 py-6 text-center text-sm text-slate-500"
                        colSpan={data.documents.length + 1}
                      >
                        Waiting for extraction to complete.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
