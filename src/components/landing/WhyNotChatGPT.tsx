"use client";

import { motion } from "framer-motion";
import { X, Check } from "lucide-react";

const chatgptItems = [
  "One-off questions",
  "Quick summaries",
  "General writing help",
];

const hiresignalItems = [
  "Consistent scoring rubric across all candidates",
  "Structured side-by-side comparison",
  "Batch processing (up to 25 resumes at once)",
  "Exportable results to share with hiring managers",
  "No copy-pasting — just upload and go",
];

export default function WhyNotChatGPT() {
  return (
    <section className="bg-white py-20 sm:py-24" aria-labelledby="why-not-chatgpt-heading">
      <div className="mx-auto max-w-5xl px-6">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.35 }}
        >
          <h2 id="why-not-chatgpt-heading" className="font-display text-3xl font-bold text-zinc-950 sm:text-4xl">
            Why not just use ChatGPT?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-base text-zinc-600">
            Fair question. Here's the honest answer.
          </p>
        </motion.div>

        <motion.div
          className="mt-12 grid gap-6 sm:grid-cols-2"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          variants={{
            visible: { transition: { staggerChildren: 0.08 } },
            hidden: {},
          }}
        >
          {/* ChatGPT column */}
          <motion.div
            variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3 } } }}
            className="rounded-2xl border border-zinc-200 bg-zinc-50 p-8"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">ChatGPT is great for</p>
            <ul className="mt-5 space-y-3">
              {chatgptItems.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-zinc-700">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" strokeWidth={2.5} aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm text-amber-800">
                <strong className="font-semibold">The problem:</strong> No rubric, no batch processing, and you're manually copy-pasting resumes one at a time.
              </p>
            </div>
          </motion.div>

          {/* HireSignal column */}
          <motion.div
            variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3 } } }}
            className="rounded-2xl border-2 border-indigo-600 bg-white p-8"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">HireSignal is built for</p>
            <ul className="mt-5 space-y-3">
              {hiresignalItems.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-zinc-700">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" strokeWidth={2.5} aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-6 rounded-xl border border-indigo-100 bg-indigo-50 p-4">
              <p className="text-sm text-indigo-800">
                <strong className="font-semibold">The difference:</strong> A repeatable, structured process — not a one-off chat.
              </p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
