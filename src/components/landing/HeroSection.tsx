"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

const WORDS = ["Stop", "Guessing.", "Start", "Hiring", "Right."];

export default function HeroSection() {
  const reduceMotion = useReducedMotion();
  return (
    <section className="relative flex min-h-[90vh] flex-col items-center justify-center overflow-hidden bg-[#1d1d1f] px-6 pt-20 pb-24">
      {/* Gradient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-[40%] left-1/2 h-[800px] w-[800px] -translate-x-1/2 rounded-full bg-indigo-500/20 blur-[120px]" />
        <div className="absolute top-[20%] -right-[20%] h-[600px] w-[600px] rounded-full bg-violet-500/10 blur-[100px]" />
      </div>
      
      {/* Grid pattern */}
      <div 
        className="pointer-events-none absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='32' height='32' fill='none' stroke='white'%3e%3cpath d='M0 .5H31.5V32'/%3e%3c/svg%3e")`,
        }}
      />

      <div className="relative z-10 mx-auto max-w-5xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-6"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-zinc-400 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Free to use · No signup required
          </span>
        </motion.div>

        <motion.h1
          className="font-display text-5xl font-bold tracking-tight text-white sm:text-6xl md:text-7xl lg:text-8xl"
          initial="hidden"
          animate="visible"
          variants={{
            visible: { transition: { staggerChildren: reduceMotion ? 0 : 0.03, delayChildren: reduceMotion ? 0 : 0.05 } },
            hidden: {},
          }}
        >
          {WORDS.map((word, i) => (
            <motion.span
              key={i}
              className="inline-block"
              variants={{
                hidden: { opacity: 0, y: reduceMotion ? 0 : 16 },
                visible: { opacity: 1, y: 0 },
              }}
              transition={{ duration: reduceMotion ? 0 : 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              {word === "Right." ? (
                <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-indigo-400 bg-clip-text text-transparent">{word}</span>
              ) : (
                <span className="mr-3 sm:mr-5">{word}</span>
              )}
            </motion.span>
          ))}
        </motion.h1>

        <motion.p
          className="mx-auto mt-6 max-w-2xl text-lg text-zinc-400 sm:text-xl"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.3 }}
        >
          Compare up to 5 resumes against any job description instantly. No signup. No bias. Just clarity.
        </motion.p>

        <motion.div
          className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.3 }}
        >
          <Link
            href="/upload"
            className="group relative inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-8 py-4 text-base font-semibold text-zinc-900 shadow-lg shadow-white/10 transition-all duration-300 hover:bg-zinc-100 hover:shadow-xl hover:shadow-white/20 sm:w-auto"
          >
            Start Comparing Free
            <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
          <a
            href="#how-it-works"
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-8 py-4 text-base font-medium text-white backdrop-blur-sm transition-all duration-300 hover:border-white/20 hover:bg-white/10 sm:w-auto"
          >
            See how it works
          </a>
        </motion.div>

        <motion.div
          className="mt-12 flex flex-wrap items-center justify-center gap-6 sm:gap-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.3 }}
        >
          <div className="flex items-center gap-2 text-sm text-zinc-300">
            <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span>PDF & DOCX supported</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-zinc-300">
            <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span>Compare up to 5 resumes</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-zinc-300">
            <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span>Instant results</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
