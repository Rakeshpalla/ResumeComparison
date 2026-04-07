"use client";

import { motion } from "framer-motion";
import { CloudUpload, BarChart3, Columns, FileText, Unlock, ShieldCheck } from "lucide-react";

const features = [
  {
    title: "Upload 2–5 Resumes",
    desc: "Drop PDF or DOCX files. No account needed.",
    icon: CloudUpload,
    span: "md:col-span-2",
  },
  {
    title: "Bias-resistant structure",
    desc: "A consistent rubric so you evaluate candidates fairly.",
    icon: ShieldCheck,
    span: "",
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
    <section className="relative overflow-hidden bg-white py-20">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -top-24 left-1/2 h-[360px] w-[760px] -translate-x-1/2 rounded-full bg-indigo-200/45 blur-[90px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-6">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.3 }}
        >
          <h2 className="font-display text-3xl font-bold text-zinc-950 sm:text-4xl">
            Built for serious hiring
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-base text-zinc-600">
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
                whileHover={{ scale: 1.02, y: -5 }}
                transition={{ type: "spring", stiffness: 350, damping: 26 }}
                className={`group relative overflow-hidden rounded-2xl border border-white/20 bg-white/70 p-6 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.10)] backdrop-blur-md ${f.span}`}
              >
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 to-violet-50 text-indigo-600">
                  <Icon className="h-5 w-5" strokeWidth={1.5} />
                </div>
                <h3 className="font-display text-lg font-semibold text-zinc-950">{f.title}</h3>
                <p className="mt-1 text-sm text-zinc-600">{f.desc}</p>

                <div
                  className="pointer-events-none absolute -right-24 -top-24 h-48 w-48 rounded-full bg-indigo-200/40 blur-[50px] transition-opacity duration-300 group-hover:opacity-100 opacity-60"
                  aria-hidden
                />
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
