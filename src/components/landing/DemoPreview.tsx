"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const candidates = [
  { initials: "AP", name: "A. Patel", role: "Senior Engineer", score: 94, skills: ["React", "TypeScript", "Node.js"], risk: "Low risk", verdict: "Strong hire" },
  { initials: "JK", name: "J. Kim", role: "Full-stack Dev", score: 87, skills: ["Vue", "Python", "AWS"], risk: "Low risk", verdict: "Interview" },
  { initials: "SR", name: "S. Rivera", role: "Frontend Dev", score: 78, skills: ["React", "CSS", "Figma"], risk: "Medium risk", verdict: "Consider" },
];

export default function DemoPreview() {
  return (
    <section id="demo" className="bg-white py-20 sm:py-24" aria-labelledby="demo-heading">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.35 }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">
            See it in action
          </p>
          <h2 id="demo-heading" className="mt-3 font-display text-3xl font-bold text-zinc-950 sm:text-4xl">
            This is what your results look like
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-base text-zinc-600">
            Structured scores, ranked candidates, and a clear recommendation — no copy-pasting, no spreadsheets.
          </p>
        </motion.div>

        <motion.div
          className="mt-12 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-lg"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.45 }}
        >
          {/* Mock toolbar */}
          <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50 px-5 py-3">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-red-400/80" aria-hidden />
              <div className="h-2.5 w-2.5 rounded-full bg-amber-400/80" aria-hidden />
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" aria-hidden />
            </div>
            <span className="text-xs font-medium text-zinc-400">HireSignal · Comparison Results</span>
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
              3 candidates ranked
            </span>
          </div>

          {/* Ranked list */}
          <div className="divide-y divide-zinc-100">
            {candidates.map((c, i) => (
              <div key={c.name} className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:gap-6">
                {/* Rank badge */}
                <div
                  className={[
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                    i === 0
                      ? "bg-indigo-600 text-white"
                      : "bg-zinc-100 text-zinc-600",
                  ].join(" ")}
                  aria-label={`Rank ${i + 1}`}
                >
                  {i + 1}
                </div>

                {/* Avatar + name */}
                <div className="flex items-center gap-3 sm:w-40">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-100 to-violet-100 text-sm font-bold text-indigo-700">
                    {c.initials}
                  </div>
                  <div>
                    <p className="font-semibold text-zinc-900">{c.name}</p>
                    <p className="text-xs text-zinc-500">{c.role}</p>
                  </div>
                </div>

                {/* Score bar */}
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500">Match score</span>
                    <span className="font-bold text-zinc-900">{c.score}%</span>
                  </div>
                  <div className="mt-1.5 h-2 rounded-full bg-zinc-100">
                    <div
                      className="h-2 rounded-full bg-indigo-500 transition-all duration-700"
                      style={{ width: `${c.score}%` }}
                    />
                  </div>
                </div>

                {/* Skills */}
                <div className="hidden flex-wrap gap-1.5 sm:flex">
                  {c.skills.map((s) => (
                    <span key={s} className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">
                      {s}
                    </span>
                  ))}
                </div>

                {/* Risk */}
                <span
                  className={[
                    "hidden shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold sm:inline-block",
                    c.risk === "Low risk"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-700",
                  ].join(" ")}
                >
                  {c.risk}
                </span>

                {/* Verdict */}
                <span
                  className={[
                    "shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold",
                    i === 0
                      ? "bg-indigo-600 text-white"
                      : "bg-zinc-100 text-zinc-700",
                  ].join(" ")}
                >
                  {c.verdict}
                </span>
              </div>
            ))}
          </div>

          {/* CTA bar */}
          <div className="flex items-center justify-between border-t border-zinc-100 bg-zinc-50 px-5 py-4">
            <p className="text-sm text-zinc-500">
              <span className="font-semibold text-zinc-800">Top pick:</span> A. Patel — 94% match, low risk, recommended for first interview.
            </p>
            <Link
              href="/upload"
              className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              Try with your resumes →
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
