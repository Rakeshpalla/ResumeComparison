"use client";

import { useState } from "react";
import type { FeedbackRow } from "@/lib/feedback-db";

/**
 * "What people are saying" — Q4 (pain point) and Q9 (open-ended) as a feed.
 */
export function OpenEndedFeed({ rows }: { rows: FeedbackRow[] }) {
  const [open, setOpen] = useState(false);
  const entries: { date: string; role: string; text: string; type: "pain" | "open" }[] = [];
  for (const r of rows) {
    if (r.pain_point?.trim()) {
      entries.push({
        date: r.created_at,
        role: r.role ?? "—",
        text: r.pain_point.trim(),
        type: "pain",
      });
    }
    if (r.open_feedback?.trim()) {
      entries.push({
        date: r.created_at,
        role: r.role ?? "—",
        text: r.open_feedback.trim(),
        type: "open",
      });
    }
  }
  entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-left font-medium text-slate-900 hover:bg-slate-50"
      >
        What people are saying
        <span className="text-slate-500">{open ? "▼" : "▶"}</span>
      </button>
      {open && (
        <div className="border-t border-slate-200 p-4">
          <ul className="space-y-4">
            {entries.length === 0 ? (
              <li className="text-sm text-slate-500">No open-ended answers yet.</li>
            ) : (
              entries.map((e, i) => (
                <li key={`${e.date}-${i}-${e.type}`} className="border-l-2 border-indigo-200 pl-4">
                  <p className="text-xs text-slate-500">
                    {new Date(e.date).toLocaleString()} · {e.role}
                    {e.type === "pain" && " · Pain point"}
                    {e.type === "open" && " · Open feedback"}
                  </p>
                  <p className="mt-1 text-slate-800">{e.text}</p>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
