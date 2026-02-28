"use client";

import { motion } from "framer-motion";
import { CloudUpload, BarChart3, Columns, FileText, Unlock } from "lucide-react";

const features = [
  {
    title: "Upload 2–5 Resumes",
    desc: "Drop PDF or DOCX files. No account needed.",
    icon: CloudUpload,
    span: "md:col-span-2",
  },
  {
    title: "Smart Scoring",
    desc: "Skills and experience matched to your job description.",
    icon: BarChart3,
    span: "",
  },
  {
    title: "Side-by-Side Comparison",
    desc: "Structured view so you compare candidates fairly.",
    icon: Columns,
    span: "",
  },
  {
    title: "PDF & DOCX Support",
    desc: "Works with the formats recruiters already use.",
    icon: FileText,
    span: "",
  },
  {
    title: "No Signup Needed",
    desc: "Start comparing in seconds. No account required.",
    icon: Unlock,
    span: "md:col-span-2",
  },
];

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

export default function FeaturesGrid() {
  return (
    <section className="relative overflow-hidden bg-[#1d1d1f] py-20">
      {/* Subtle gradient background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[400px] w-[700px] -translate-x-1/2 rounded-full bg-indigo-500/5 blur-[100px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-6">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.3 }}
        >
          <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">
            Built for serious hiring
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-base text-zinc-400">
            Everything you need to compare candidates quickly and fairly.
          </p>
        </motion.div>

        <motion.div
          className="mt-12 grid gap-4 md:grid-cols-3"
          variants={container}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                variants={item}
                className={`group relative overflow-hidden rounded-2xl border border-white/5 bg-zinc-900/50 p-6 transition-all duration-300 hover:border-white/10 hover:bg-zinc-900/80 ${f.span}`}
              >
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-800 text-indigo-400 transition-colors group-hover:bg-indigo-500/10">
                  <Icon className="h-5 w-5" strokeWidth={1.5} />
                </div>
                <h3 className="font-display text-lg font-semibold text-white">{f.title}</h3>
                <p className="mt-1 text-sm text-zinc-400">{f.desc}</p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
