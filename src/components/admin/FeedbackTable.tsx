"use client";

import { useState, useMemo } from "react";
import type { FeedbackRow } from "@/lib/feedback-db";
import { ROLE_OPTIONS } from "@/lib/validations/feedback";

const PAGE_SIZE = 20;
type SortKey = "created_at" | "usefulness_rating";
type SortDir = "asc" | "desc";

/**
 * Response table: sortable by Date and Usefulness, filter by Role, paginate 20 per page.
 */
export function FeedbackTable({ rows }: { rows: FeedbackRow[] }) {
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    let list = rows;
    if (roleFilter) {
      list = list.filter((r) => r.role === roleFilter);
    }
    list = [...list].sort((a, b) => {
      if (sortKey === "created_at") {
        const ta = new Date(a.created_at).getTime();
        const tb = new Date(b.created_at).getTime();
        return sortDir === "desc" ? tb - ta : ta - tb;
      }
      const va = a.usefulness_rating ?? 0;
      const vb = b.usefulness_rating ?? 0;
      return sortDir === "desc" ? vb - va : va - vb;
    });
    return list;
  }, [rows, roleFilter, sortKey, sortDir]);

  const paginated = useMemo(() => {
    const start = page * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else {
      setSortKey(key);
      setSortDir(key === "created_at" ? "desc" : "desc");
    }
    setPage(0);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          Filter by role
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(0);
            }}
            className="rounded-lg border border-white/10 bg-zinc-800 px-3 py-1.5 text-white"
          >
            <option value="">All</option>
            {ROLE_OPTIONS.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/10 bg-zinc-900/50">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="border-b border-white/10 bg-zinc-800/50">
            <tr>
              <th className="px-4 py-3 font-medium text-zinc-300">
                <button
                  type="button"
                  onClick={() => toggleSort("created_at")}
                  className="hover:text-indigo-400"
                >
                  Date {sortKey === "created_at" ? (sortDir === "desc" ? "↓" : "↑") : ""}
                </button>
              </th>
              <th className="px-4 py-3 font-medium text-zinc-300">Role</th>
              <th className="px-4 py-3 font-medium text-zinc-300">Resumes/Role</th>
              <th className="px-4 py-3 font-medium text-zinc-300">
                <button
                  type="button"
                  onClick={() => toggleSort("usefulness_rating")}
                  className="hover:text-indigo-400"
                >
                  Usefulness ★ {sortKey === "usefulness_rating" ? (sortDir === "desc" ? "↓" : "↑") : ""}
                </button>
              </th>
              <th className="px-4 py-3 font-medium text-zinc-300">Would Recommend</th>
              <th className="px-4 py-3 font-medium text-zinc-300">Missing Features</th>
              <th className="px-4 py-3 font-medium text-zinc-300">Email</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((r) => (
              <tr key={r.id} className="border-b border-white/5 hover:bg-white/5">
                <td className="px-4 py-3 text-zinc-400">
                  {new Date(r.created_at).toLocaleString(undefined, {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </td>
                <td className="px-4 py-3 text-white">{r.role ?? "—"}</td>
                <td className="px-4 py-3 text-white">{r.resumes_per_role ?? "—"}</td>
                <td className="px-4 py-3 text-white">{r.usefulness_rating ?? "—"}</td>
                <td className="px-4 py-3 text-white">{r.would_recommend ?? "—"}</td>
                <td className="max-w-[200px] truncate px-4 py-3 text-zinc-400" title={(r.missing_features ?? []).join(", ")}>
                  {(r.missing_features ?? []).join(", ") || "—"}
                </td>
                <td className="px-4 py-3 text-zinc-400">{r.email ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-zinc-400">
            Page {page + 1} of {totalPages} ({filtered.length} rows)
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border border-white/10 bg-zinc-800 px-3 py-1.5 text-sm text-white disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-white/10 bg-zinc-800 px-3 py-1.5 text-sm text-white disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
