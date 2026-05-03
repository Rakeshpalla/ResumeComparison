"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Check } from "lucide-react";

const freeTier = {
  name: "Free",
  price: "$0",
  description: "Everything you need to get started.",
  cta: "Start for free",
  ctaHref: "/upload",
  features: [
    "5 comparisons per month",
    "Up to 5 resumes per comparison",
    "PDF & DOCX support",
    "AI-powered ranking",
    "No credit card required",
  ],
};

const proTier = {
  name: "Pro",
  price: "$19",
  period: "/month",
  description: "For recruiters who hire regularly.",
  cta: "Join waitlist",
  ctaHref: "#",
  badge: "Coming soon",
  features: [
    "Unlimited comparisons",
    "Up to 25 resumes per comparison",
    "Save comparison history",
    "Priority processing",
    "CSV export",
    'Remove "Made with HireSignal" watermark',
  ],
};

export default function PricingSection() {
  return (
    <section className="bg-[#F9FAFB] py-20 sm:py-24" aria-labelledby="pricing-heading">
      <div className="mx-auto max-w-5xl px-6">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.35 }}
        >
          <h2 id="pricing-heading" className="font-display text-3xl font-bold text-zinc-950 sm:text-4xl">
            Simple, transparent pricing
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-base text-zinc-600">
            Start free. Upgrade when you need more.
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
          {/* Free tier */}
          <motion.div
            variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3 } } }}
            className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-zinc-500">{freeTier.name}</p>
                <p className="mt-1 font-display text-4xl font-bold text-zinc-950">{freeTier.price}</p>
              </div>
            </div>
            <p className="mt-3 text-sm text-zinc-600">{freeTier.description}</p>

            <ul className="mt-6 space-y-3">
              {freeTier.features.map((f) => (
                <li key={f} className="flex items-start gap-3 text-sm text-zinc-700">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" strokeWidth={2.5} aria-hidden />
                  {f}
                </li>
              ))}
            </ul>

            <Link
              href={freeTier.ctaHref}
              className="mt-8 inline-flex w-full items-center justify-center rounded-lg border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50"
            >
              {freeTier.cta}
            </Link>
          </motion.div>

          {/* Pro tier */}
          <motion.div
            variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.3 } } }}
            className="relative rounded-2xl border-2 border-indigo-600 bg-white p-8 shadow-sm"
          >
            {proTier.badge && (
              <span className="absolute right-5 top-5 rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white">
                {proTier.badge}
              </span>
            )}
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">{proTier.name}</p>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="font-display text-4xl font-bold text-zinc-950">{proTier.price}</span>
                <span className="text-sm text-zinc-500">{proTier.period}</span>
              </div>
            </div>
            <p className="mt-3 text-sm text-zinc-600">{proTier.description}</p>

            <ul className="mt-6 space-y-3">
              {proTier.features.map((f) => (
                <li key={f} className="flex items-start gap-3 text-sm text-zinc-700">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" strokeWidth={2.5} aria-hidden />
                  {f}
                </li>
              ))}
            </ul>

            <a
              href={proTier.ctaHref}
              className="mt-8 inline-flex w-full items-center justify-center rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              {proTier.cta}
            </a>
          </motion.div>
        </motion.div>

        <p className="mt-6 text-center text-sm text-zinc-500">
          Pro tier coming soon — join the waitlist to get notified at launch.
        </p>
      </div>
    </section>
  );
}
