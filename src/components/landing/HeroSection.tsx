"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

export default function HeroSection() {
  const reduceMotion = useReducedMotion();
  return (
    <section className="relative overflow-hidden px-6 pt-24 pb-10 sm:pt-28">
      {/* Subtle background glows */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -top-28 -left-28 h-[480px] w-[480px] rounded-full bg-indigo-100/70 blur-[100px]" />
        <div className="absolute -bottom-24 -right-32 h-[480px] w-[480px] rounded-full bg-violet-100/70 blur-[100px]" />
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
            <div className="inline-flex items-center gap-2 rounded-lg border border-black/10 bg-white/80 px-4 py-1.5 text-sm font-medium text-zinc-600 shadow-sm backdrop-blur-md">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
              Free to use · No credit card required
            </div>

            <h1 className="mt-6 font-display text-[2.75rem] font-bold leading-[1.1] tracking-tight text-zinc-950 sm:text-5xl lg:text-[3.25rem]">
              Screen 50 resumes<br />
              <span className="text-indigo-600">in 5 minutes.</span>
            </h1>

            <p className="mt-5 text-lg font-normal leading-relaxed text-zinc-600">
              AI-powered resume ranking for solo recruiters. Upload up to 25 candidates, get a structured shortlist in seconds.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/upload"
                className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-6 py-3.5 text-base font-semibold text-white transition hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
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
                href="#demo"
                className="inline-flex items-center justify-center rounded-lg border border-zinc-300 bg-white px-6 py-3.5 text-base font-semibold text-zinc-800 transition hover:bg-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500"
              >
                See Demo
              </a>
            </div>

            <p className="mt-5 text-sm text-zinc-500">
              Free to use · No credit card · PDF &amp; DOCX supported
            </p>
          </motion.div>

          {/* Right: dashboard mockup */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.05, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="relative"
          >
            <motion.div
              className="relative mx-auto max-w-xl"
              animate={reduceMotion ? undefined : { y: [0, -8, 0] }}
              transition={reduceMotion ? undefined : { duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
              style={{ transformStyle: "preserve-3d" }}
            >
              {/* Back layer */}
              <div
                className="absolute inset-0 rounded-2xl border border-white/20 bg-white/40 backdrop-blur-md"
                style={{
                  transform: "perspective(1200px) rotateY(-12deg) rotateX(8deg) translateZ(-40px) translateX(-16px) translateY(20px)",
                  boxShadow: "0 8px 24px -8px rgba(0,0,0,0.08)",
                }}
                aria-hidden
              />

              {/* Mid layer */}
              <div
                className="absolute inset-0 rounded-2xl border border-white/20 bg-white/50 backdrop-blur-md"
                style={{
                  transform: "perspective(1200px) rotateY(-12deg) rotateX(8deg) translateZ(-16px) translateX(8px) translateY(8px)",
                  boxShadow: "0 8px 24px -8px rgba(0,0,0,0.06)",
                }}
                aria-hidden
              />

              {/* Front dashboard */}
              <div
                className="relative overflow-hidden rounded-2xl border border-black/5 bg-white shadow-xl"
                style={{
                  transform: "perspective(1200px) rotateY(-12deg) rotateX(8deg)",
                }}
              >
                {/* Window chrome */}
                <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50 px-5 py-3">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
                    <div className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
                    <div className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
                  </div>
                  <div className="text-xs font-medium text-zinc-400">HireSignal · Results</div>
                  <div className="h-5 w-14 rounded bg-zinc-200/60" />
                </div>

                <div className="p-5">
                  <div className="grid grid-cols-3 gap-3">
                    {/* Ranked candidates */}
                    <div className="col-span-2 rounded-xl border border-zinc-100 bg-zinc-50/80 p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold text-zinc-900">Top matches</div>
                        <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                          5 candidates
                        </span>
                      </div>
                      <div className="mt-4 space-y-3">
                        {[
                          { score: 94, label: "A. Patel" },
                          { score: 87, label: "J. Kim" },
                          { score: 78, label: "S. Rivera" },
                        ].map((c) => (
                          <div key={c.label} className="flex items-center gap-3">
                            <div className="h-7 w-7 shrink-0 rounded-lg bg-gradient-to-br from-indigo-100 to-violet-100 text-center text-xs font-bold leading-7 text-indigo-700">
                              {c.label[0]}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-medium text-zinc-700">{c.label}</span>
                                <span className="font-semibold text-zinc-900">{c.score}%</span>
                              </div>
                              <div className="mt-1 h-1.5 rounded-full bg-zinc-200">
                                <div
                                  className="h-1.5 rounded-full bg-indigo-500"
                                  style={{ width: `${c.score}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Signals */}
                    <div className="rounded-xl border border-zinc-100 bg-zinc-50/80 p-4">
                      <div className="text-sm font-semibold text-zinc-900">Signals</div>
                      <div className="mt-4 space-y-2">
                        {[
                          { k: "Skills", v: "Strong" },
                          { k: "Tenure", v: "Good" },
                          { k: "Fit", v: "High" },
                        ].map((row) => (
                          <div key={row.k} className="flex items-center justify-between text-xs">
                            <span className="text-zinc-500">{row.k}</span>
                            <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-medium text-zinc-700">{row.v}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 rounded-lg bg-indigo-50 p-3">
                        <div className="text-xs font-semibold text-indigo-900">Recommendation</div>
                        <div className="mt-1 text-xs text-indigo-700">Interview A. Patel first.</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
