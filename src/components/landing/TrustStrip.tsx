"use client";

import { motion } from "framer-motion";
import { FileStack, FileType2, Target, LayoutGrid } from "lucide-react";

const pillars = [
  {
    icon: FileStack,
    title: "2–5 resumes",
    subtitle: "Per session — only what you need.",
  },
  {
    icon: FileType2,
    title: "PDF & DOCX",
    subtitle: "Formats recruiters already use.",
  },
  {
    icon: Target,
    title: "Optional JD",
    subtitle: "Match scores to your role.",
  },
  {
    icon: LayoutGrid,
    title: "Side-by-side",
    subtitle: "Structured, fair comparison.",
  },
];

export default function TrustStrip() {
  return (
    <section
      className="relative border-t border-white/[0.06] bg-[#1d1d1f] py-16 sm:py-20"
      aria-labelledby="trust-strip-heading"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/25 to-transparent" />

      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.35 }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-400/90">
            At a glance
          </p>
          <h2
            id="trust-strip-heading"
            className="mt-3 font-display text-2xl font-bold text-white sm:text-3xl"
          >
            Clarity for every shortlist
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-zinc-400 sm:text-base">
            No noise — just upload, compare, and decide. Factual tools for hiring teams.
          </p>
        </motion.div>

        <motion.ul
          className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          variants={{
            visible: { transition: { staggerChildren: 0.06 } },
            hidden: {},
          }}
        >
          {pillars.map((p) => {
            const Icon = p.icon;
            return (
              <motion.li
                key={p.title}
                variants={{
                  hidden: { opacity: 0, y: 12 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.28 } },
                }}
                className="rounded-2xl border border-white/[0.06] bg-zinc-900/40 p-5 backdrop-blur-sm transition hover:border-white/10 hover:bg-zinc-900/70"
              >
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-300">
                  <Icon className="h-5 w-5" strokeWidth={1.5} aria-hidden />
                </div>
                <p className="font-display text-sm font-semibold text-white">{p.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-zinc-500">{p.subtitle}</p>
              </motion.li>
            );
          })}
        </motion.ul>
      </div>
    </section>
  );
}
