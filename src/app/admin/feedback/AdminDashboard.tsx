"use client";

import type { FeedbackRow } from "@/lib/feedback-db";
import { SummaryCards } from "@/components/admin/SummaryCards";
import { FeedbackTable } from "@/components/admin/FeedbackTable";
import { OpenEndedFeed } from "@/components/admin/OpenEndedFeed";

/**
 * Admin dashboard: summary cards, table, export button, open-ended feed.
 */
export function AdminDashboard({ initialRows }: { initialRows: FeedbackRow[] }) {
  async function handleExport() {
    try {
      const res = await fetch("/api/feedback/export", { credentials: "include" });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "feedback-export.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Export failed. Make sure you are logged in.");
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Feedback dashboard</h1>
        <button
          type="button"
          onClick={handleExport}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Export to CSV
        </button>
      </div>

      <SummaryCards rows={initialRows} />
      <FeedbackTable rows={initialRows} />
      <OpenEndedFeed rows={initialRows} />
    </div>
  );
}
