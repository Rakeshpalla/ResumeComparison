"use client";

import { motion } from "framer-motion";

const testimonials = [
  {
    quote: "Saved me 3 hours on my last hire. The side-by-side comparison made decision-making so much easier.",
    name: "Sarah M.",
    title: "Tech Recruiter",
    initials: "SM",
  },
  {
    quote: "Finally, a tool that doesn't require me to learn another platform. Upload, compare, done.",
    name: "James K.",
    title: "Startup Founder",
    initials: "JK",
  },
  {
    quote: "The structured rubric keeps me honest and helps me avoid bias when reviewing candidates.",
    name: "Priya S.",
    title: "HR Manager",
    initials: "PS",
  },
];

export default function TestimonialsSection() {
  return (
    <section className="bg-[#F9FAFB] py-20 sm:py-24" aria-labelledby="testimonials-heading">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.35 }}
        >
          <h2 id="testimonials-heading" className="font-display text-3xl font-bold text-zinc-950 sm:text-4xl">
            What recruiters say
          </h2>
        </motion.div>

        <motion.div
          className="mt-12 grid gap-6 sm:grid-cols-3"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          variants={{
            visible: { transition: { staggerChildren: 0.08 } },
            hidden: {},
          }}
        >
          {testimonials.map((t) => (
            <motion.div
              key={t.name}
              variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3 } } }}
              className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-7 shadow-sm"
            >
              {/* Quote mark */}
              <svg className="h-8 w-8 text-indigo-200" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
              </svg>

              <p className="mt-4 flex-1 text-sm leading-relaxed text-zinc-700">{t.quote}</p>

              <div className="mt-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-sm font-bold text-indigo-700">
                  {t.initials}
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-900">{t.name}</p>
                  <p className="text-xs text-zinc-500">{t.title}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
