"use client";

import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    quote: "Cut my shortlist time in half. No more spreadsheets.",
    author: "Early User",
    role: "Hiring Manager",
    stars: 5,
  },
  {
    quote: "Finally a tool that compares apples to apples. Game changer.",
    author: "Early User",
    role: "Recruiter",
    stars: 5,
  },
  {
    quote: "Used it for a senior role — had a ranked list in minutes.",
    author: "Early User",
    role: "Tech Lead",
    stars: 5,
  },
];

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function SocialProof() {
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
            Loved by hiring teams
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-base text-zinc-400">
            Built for the people doing the real work.
          </p>
        </motion.div>

        <motion.div
          className="mt-12 grid gap-5 md:grid-cols-3"
          variants={container}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          {testimonials.map((t, idx) => (
            <motion.div
              key={idx}
              variants={item}
              className="group relative overflow-hidden rounded-2xl border border-white/5 bg-zinc-900/50 p-6 transition-all duration-300 hover:border-white/10 hover:bg-zinc-900/80"
            >
              <Quote className="mb-3 h-6 w-6 text-indigo-400/30" strokeWidth={1.5} />
              
              <div className="mb-3 flex gap-0.5">
                {Array.from({ length: t.stars }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" strokeWidth={1.5} />
                ))}
              </div>

              <p className="text-base text-zinc-300">&ldquo;{t.quote}&rdquo;</p>
              
              <div className="mt-4 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-sm font-medium text-white">
                  {t.author.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{t.author}</p>
                  <p className="text-xs text-zinc-500">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
