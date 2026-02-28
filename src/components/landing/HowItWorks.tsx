"use client";

import { motion } from "framer-motion";
import { Upload, FileText, BarChart3 } from "lucide-react";

const STEPS = [
  { 
    id: 1, 
    title: "Upload resumes", 
    desc: "Drop 2–5 PDF or DOCX files",
    icon: Upload,
  },
  { 
    id: 2, 
    title: "Add job description", 
    desc: "Optional — paste the role requirements",
    icon: FileText,
  },
  { 
    id: 3, 
    title: "Get ranked results", 
    desc: "Side-by-side comparison with match scores",
    icon: BarChart3,
  },
];

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="relative bg-[#1d1d1f] py-20">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.3 }}
        >
          <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">
            How it works
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-base text-zinc-400">
            Three simple steps from upload to ranked comparison.
          </p>
        </motion.div>

        <motion.div
          className="mt-12"
          variants={container}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          {/* Stepper line - desktop */}
          <div className="relative hidden md:block">
            <div className="absolute left-0 right-0 top-8 h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {STEPS.map((step) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.id}
                  variants={item}
                  className="relative flex flex-col items-center text-center"
                >
                  {/* Step number circle */}
                  <div className="relative z-10 mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-zinc-900">
                    <Icon className="h-7 w-7 text-indigo-400" strokeWidth={1.5} />
                  </div>

                  <span className="mb-2 text-sm font-medium text-indigo-400">Step {step.id}</span>
                  <h3 className="font-display text-lg font-semibold text-white">{step.title}</h3>
                  <p className="mt-1 text-sm text-zinc-500">{step.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
