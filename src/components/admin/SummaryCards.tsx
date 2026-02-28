"use client";

import type { FeedbackRow } from "@/lib/feedback-db";

/**
 * Summary cards: total responses, avg usefulness, NPS-style %, most common missing feature.
 */
export function SummaryCards({ rows }: { rows: FeedbackRow[] }) {
  const total = rows.length;
  const ratings = rows.map((r) => r.usefulness_rating).filter((n): n is number => n != null);
  const avgUsefulness =
    ratings.length > 0
      ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
      : "—";
  const promoters = rows.filter(
    (r) => r.would_recommend === "Definitely yes" || r.would_recommend === "Probably yes"
  ).length;
  const npsPct = total > 0 ? Math.round((promoters / total) * 100) : 0;
  const missingCounts: Record<string, number> = {};
  for (const r of rows) {
    const arr = r.missing_features ?? [];
    for (const f of arr) {
      missingCounts[f] = (missingCounts[f] ?? 0) + 1;
    }
  }
  const topMissing =
    Object.entries(missingCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
        <p className="text-sm font-medium text-zinc-400">Total responses</p>
        <p className="mt-1 text-2xl font-bold text-white">{total}</p>
      </div>
      <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
        <p className="text-sm font-medium text-zinc-400">Avg. usefulness (★)</p>
        <p className="mt-1 text-2xl font-bold text-white">{avgUsefulness}</p>
      </div>
      <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
        <p className="text-sm font-medium text-zinc-400">Would recommend (yes %)</p>
        <p className="mt-1 text-2xl font-bold text-white">{npsPct}%</p>
      </div>
      <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
        <p className="text-sm font-medium text-zinc-400">Top missing feature</p>
        <p className="mt-1 text-lg font-bold text-white truncate" title={topMissing}>{topMissing}</p>
      </div>
    </div>
  );
}
