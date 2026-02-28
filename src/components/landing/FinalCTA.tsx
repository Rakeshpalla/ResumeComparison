"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function FinalCTA() {
  return (
    <section className="relative overflow-hidden bg-[#1d1d1f] py-20">
      {/* Background effects */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/10 blur-[100px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.3 }}
        >
          <h2 className="font-display text-3xl font-bold text-white sm:text-4xl md:text-5xl">
            Your next great hire is in
            <br />
            that pile of resumes.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-zinc-400">
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              Let&apos;s find them together.
            </span>
          </p>
        </motion.div>

        <motion.div
          className="mt-8"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Link
            href="/upload"
            className="group relative inline-flex items-center gap-3 rounded-full bg-white px-8 py-4 text-base font-semibold text-zinc-900 shadow-lg shadow-white/10 transition-all duration-300 hover:bg-zinc-100 hover:shadow-xl hover:shadow-white/20"
          >
            Start Comparing Free
            <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </motion.div>

        <motion.p
          className="mt-6 text-sm text-zinc-500"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.3, delay: 0.15 }}
        >
          Free to use · No signup required · Works with PDF & DOCX
        </motion.p>
      </div>
    </section>
  );
}
