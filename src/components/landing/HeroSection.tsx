"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

export default function HeroSection() {
  const reduceMotion = useReducedMotion();
  return (
    <section className="relative overflow-hidden px-6 pt-24 pb-10 sm:pt-28">
      {/* Corner glow */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -top-28 -left-28 h-[520px] w-[520px] rounded-full bg-indigo-200/60 blur-[90px]" />
        <div className="absolute -bottom-24 -right-32 h-[520px] w-[520px] rounded-full bg-violet-200/60 blur-[90px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-white via-[#F9FAFB] to-white" />
      </div>

      <div className="relative mx-auto max-w-7xl">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-10">
          {/* Left: copy */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="max-w-xl"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-4 py-1.5 text-sm text-zinc-700 shadow-[0_10px_30px_-18px_rgba(0,0,0,0.25)] backdrop-blur-md">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Free to use · No signup required
            </div>

            <h1 className="mt-6 font-display text-5xl font-bold tracking-tight text-zinc-950 sm:text-6xl">
              Stop guessing.{" "}
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">
                Start hiring right.
              </span>
            </h1>

            <p className="mt-6 text-lg leading-relaxed text-zinc-600 sm:text-xl">
              Compare up to 5 resumes against any job description instantly. A structured, fair shortlist—without the noise.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/upload"
                className="group relative inline-flex items-center justify-center rounded-full px-7 py-4 text-base font-semibold text-white shadow-[0_18px_45px_-18px_rgba(37,99,235,0.55)]"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(59,130,246,1) 0%, rgba(79,70,229,1) 55%, rgba(67,56,202,1) 100%)",
                  boxShadow:
                    "0 18px 45px -18px rgba(37,99,235,0.55), inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -10px 18px rgba(0,0,0,0.12)",
                }}
              >
                Start Comparing Free
                <svg
                  className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>

              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white/70 px-7 py-4 text-base font-medium text-zinc-900 shadow-[0_10px_30px_-18px_rgba(0,0,0,0.25)] backdrop-blur-md transition hover:bg-white"
              >
                See how it works
              </a>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-4 text-sm text-zinc-600">
              {["PDF & DOCX supported", "Compare up to 5 resumes", "Instant results"].map((t) => (
                <div key={t} className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-4 py-2 backdrop-blur-md">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span>{t}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right: 3D mock */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.05, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="relative"
          >
            <motion.div
              className="relative mx-auto max-w-xl"
              animate={reduceMotion ? undefined : { y: [0, -10, 0] }}
              transition={reduceMotion ? undefined : { duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
              style={{ transformStyle: "preserve-3d" }}
            >
              {/* Back layer */}
              <div
                className="absolute inset-0 -translate-x-4 translate-y-6 rounded-[28px] border border-white/20 bg-white/50 backdrop-blur-md"
                style={{
                  transform: "perspective(1200px) rotateY(-14deg) rotateX(10deg) translateZ(-40px)",
                  boxShadow: "0 10px 30px -10px rgba(0,0,0,0.10)",
                }}
                aria-hidden
              />

              {/* Mid layer */}
              <div
                className="absolute inset-0 translate-x-3 translate-y-3 rounded-[28px] border border-white/20 bg-white/50 backdrop-blur-md"
                style={{
                  transform: "perspective(1200px) rotateY(-14deg) rotateX(10deg) translateZ(-16px)",
                  boxShadow: "0 10px 30px -10px rgba(0,0,0,0.08)",
                }}
                aria-hidden
              />

              {/* Front dashboard */}
              <div
                className="relative overflow-hidden rounded-[28px] border border-white/20 bg-white/70 backdrop-blur-md"
                style={{
                  transform: "perspective(1200px) rotateY(-14deg) rotateX(10deg)",
                  boxShadow: "0 10px 30px -10px rgba(0,0,0,0.10)",
                }}
              >
                <div className="flex items-center justify-between border-b border-black/5 px-5 py-4">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
                    <div className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
                    <div className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
                  </div>
                  <div className="text-xs font-medium text-zinc-500">Comparison Dashboard</div>
                  <div className="h-6 w-16 rounded-full bg-zinc-900/[0.04]" />
                </div>

                <div className="p-5">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2 rounded-2xl border border-white/20 bg-white/60 p-4 shadow-[0_10px_30px_-18px_rgba(0,0,0,0.25)]">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold text-zinc-900">Top matches</div>
                        <div className="text-xs text-zinc-500">Today</div>
                      </div>
                      <div className="mt-4 space-y-3">
                        {[92, 87, 81].map((v) => (
                          <div key={v} className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-blue-100 to-violet-100" />
                            <div className="flex-1">
                              <div className="flex items-center justify-between text-xs text-zinc-600">
                                <span>Candidate</span>
                                <span className="font-semibold text-zinc-900">{v}%</span>
                              </div>
                              <div className="mt-1 h-2 rounded-full bg-zinc-900/[0.06]">
                                <div
                                  className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600"
                                  style={{ width: `${v}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/20 bg-white/60 p-4 shadow-[0_10px_30px_-18px_rgba(0,0,0,0.25)]">
                      <div className="text-sm font-semibold text-zinc-900">Signals</div>
                      <div className="mt-4 space-y-2">
                        {[
                          { k: "Skills", v: "Strong" },
                          { k: "Tenure", v: "Good" },
                          { k: "Fit", v: "High" },
                        ].map((row) => (
                          <div key={row.k} className="flex items-center justify-between text-xs text-zinc-600">
                            <span>{row.k}</span>
                            <span className="rounded-full bg-zinc-900/[0.04] px-2 py-1 text-zinc-700">{row.v}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 rounded-xl bg-gradient-to-br from-blue-50 to-violet-50 p-3">
                        <div className="text-xs font-semibold text-zinc-900">Recommendation</div>
                        <div className="mt-1 text-xs text-zinc-600">Prioritize interview for the top 2.</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* subtle sheen */}
                <div
                  className="pointer-events-none absolute inset-0 opacity-70"
                  style={{
                    background:
                      "radial-gradient(800px 200px at 20% 0%, rgba(255,255,255,0.85), rgba(255,255,255,0) 60%)",
                  }}
                  aria-hidden
                />
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
