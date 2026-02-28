"use client";

import { motion } from "framer-motion";
import { Clock, Scale, Eye } from "lucide-react";

const cards = [
  {
    stat: "23 Hours",
    label: "Average time spent screening per hire",
    icon: Clock,
    gradient: "from-rose-500 to-orange-500",
  },
  {
    stat: "75%",
    label: "Resumes rejected due to bias, not skill",
    icon: Scale,
    gradient: "from-violet-500 to-purple-500",
  },
  {
    stat: "6 Seconds",
    label: "Time a recruiter spends on one resume",
    icon: Eye,
    gradient: "from-blue-500 to-cyan-500",
  },
];

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function ProblemSection() {
  return (
    <section className="relative overflow-hidden bg-[#1d1d1f] py-20">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.3 }}
        >
          <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">
            Resume screening is{" "}
            <span className="bg-gradient-to-r from-rose-400 to-orange-400 bg-clip-text text-transparent">
              broken
            </span>
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-base text-zinc-400">
            The hiring process wastes time and talent. Here's why.
          </p>
        </motion.div>

        <motion.div
          className="mt-12 grid gap-5 md:grid-cols-3"
          variants={container}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <motion.div
                key={c.stat}
                variants={item}
                className="group relative overflow-hidden rounded-2xl border border-white/5 bg-zinc-900/50 p-6 backdrop-blur-sm transition-all duration-300 hover:border-white/10 hover:bg-zinc-900/80"
              >
                <div className={`mb-4 inline-flex rounded-xl bg-gradient-to-br ${c.gradient} p-2.5`}>
                  <Icon className="h-5 w-5 text-white" strokeWidth={1.5} />
                </div>
                <p className="font-display text-3xl font-bold text-white">{c.stat}</p>
                <p className="mt-1 text-sm text-zinc-400">{c.label}</p>
                
                {/* Hover glow effect */}
                <div className={`pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-br ${c.gradient} opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-10`} />
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
