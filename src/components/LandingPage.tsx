"use client";

import Link from "next/link";

const steps = [
  {
    title: "Add job description (optional)",
    description: "Paste the role requirements to get fit scores and targeted interview questions.",
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    title: "Upload 2–5 resumes",
    description: "PDF or DOCX. Drag and drop or browse. No account required.",
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
    ),
  },
  {
    title: "Get side-by-side comparison",
    description: "Structured analysis, ranking, and one-click export to Excel.",
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
];

const benefits = [
  "No signup required",
  "Free to use",
  "PDF & DOCX",
  "2–5 resumes at once",
];

export function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* Top bar */}
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-slate-200/60 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/25">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
              Resume Comparison Engine
            </span>
          </Link>
          <nav className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/feedback"
              className="hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 sm:block"
            >
              Feedback
            </Link>
            <Link
              href="/terms"
              className="hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 sm:block"
            >
              Terms
            </Link>
            <Link
              href="/privacy"
              className="hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 sm:block"
            >
              Privacy
            </Link>
            <Link
              href="/upload"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition-all hover:from-indigo-700 hover:to-purple-700 hover:shadow-xl hover:shadow-indigo-500/35 active:scale-[0.98]"
            >
              Start comparing
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-28 pb-20 sm:pt-36 sm:pb-28 md:pt-40 md:pb-32">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(99,102,241,0.12),transparent)]" />
        <div className="mx-auto max-w-4xl animate-fade-in px-4 text-center sm:px-6 lg:px-8">
          <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-indigo-600">
            For hiring managers & recruiters
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl md:text-6xl">
            Compare resumes side by side in{" "}
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              minutes
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600 sm:text-xl">
            Upload 2–5 resumes, add an optional job description, and get a structured comparison with ranking and one-click Excel export. No signup required.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/upload"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-4 text-base font-semibold text-white shadow-xl shadow-indigo-500/30 transition-all hover:from-indigo-700 hover:to-purple-700 hover:shadow-2xl hover:shadow-indigo-500/35 active:scale-[0.98] sm:w-auto"
            >
              Upload resumes & compare
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <Link
              href="/feedback"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-8 py-4 text-base font-semibold text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50 sm:w-auto"
            >
              Give feedback
            </Link>
          </div>
        </div>
      </section>

      {/* Benefits strip */}
      <section className="border-y border-slate-200/80 bg-slate-50/80 py-6">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-x-8 gap-y-2 px-4 sm:gap-x-12 sm:px-6">
          {benefits.map((item) => (
            <span key={item} className="flex items-center gap-2 text-sm font-medium text-slate-600">
              <span className="flex h-1.5 w-1.5 rounded-full bg-indigo-500" />
              {item}
            </span>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            How it works
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-slate-600">
            Three simple steps from upload to decision-ready comparison.
          </p>
          <div className="mt-16 grid gap-10 sm:grid-cols-3 sm:gap-8">
            {steps.map((step, i) => (
              <div
                key={step.title}
                className="relative animate-fade-in rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm transition-all hover:border-indigo-200/80 hover:shadow-md"
                style={{ animationDelay: `${i * 100}ms`, animationFillMode: "backwards" } as React.CSSProperties}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                  {step.icon}
                </div>
                <p className="mt-5 text-sm font-semibold uppercase tracking-wider text-indigo-600">
                  Step {i + 1}
                </p>
                <h3 className="mt-2 text-lg font-bold text-slate-900">{step.title}</h3>
                <p className="mt-2 text-slate-600">{step.description}</p>
              </div>
            ))}
          </div>
          <div className="mt-14 text-center">
            <Link
              href="/upload"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-slate-800 active:scale-[0.98]"
            >
              Get started
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA band */}
      <section className="border-t border-slate-200/80 bg-gradient-to-br from-indigo-50/80 to-purple-50/50 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Ready to shortlist candidates faster?
          </h2>
          <p className="mt-3 text-slate-600">
            Join hiring managers and recruiters who use Resume Comparison Engine to reduce bias and make consistent decisions.
          </p>
          <Link
            href="/upload"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:from-indigo-700 hover:to-purple-700 hover:shadow-xl active:scale-[0.98]"
          >
            Upload resumes now
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-slate-700">Resume Comparison Engine</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-sm">
            <Link href="/feedback" className="font-medium text-indigo-600 hover:text-indigo-700 hover:underline">
              Give feedback
            </Link>
            <Link href="/terms" className="text-slate-500 hover:text-slate-700 hover:underline">
              Terms of Service
            </Link>
            <Link href="/privacy" className="text-slate-500 hover:text-slate-700 hover:underline">
              Privacy Policy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
