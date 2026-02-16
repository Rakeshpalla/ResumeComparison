"use client";

type DocumentAnalyzerProps = {
  title?: string;
  subtitle?: string;
  /** Compact layout for inline use (e.g. upload page); default false = full card */
  compact?: boolean;
  className?: string;
};

export function DocumentAnalyzer({
  title = "Analyzing resumes",
  subtitle = "Usually 15–30 seconds. Extracting text, scoring dimensions, and building your comparison.",
  compact = false,
  className = ""
}: DocumentAnalyzerProps) {
  return (
    <div
      className={`relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 shadow-lg shadow-slate-200/50 ${compact ? "py-6" : "p-8 py-10"} ${className}`}
      role="status"
      aria-live="polite"
      aria-label="Analyzing documents"
    >
      {/* Glow */}
      <div className="pointer-events-none absolute inset-0 -m-4 rounded-full bg-gradient-to-r from-indigo-400/15 to-purple-400/15 blur-2xl" />

      {/* Document stack + scanner */}
      <div className="relative mb-6 flex h-32 w-40 items-center justify-center">
        {/* Left page */}
        <div
          className="absolute left-0 top-1/2 flex h-20 w-14 -translate-y-1/2 items-center justify-center rounded-lg border-2 border-slate-200/80 bg-white shadow-md"
          style={{ transform: "translateX(-8px) translateY(-50%) rotate(-6deg)" }}
        >
          <DocumentIcon />
        </div>
        {/* Right page */}
        <div
          className="absolute right-0 top-1/2 flex h-20 w-14 -translate-y-1/2 items-center justify-center rounded-lg border-2 border-slate-200/80 bg-white shadow-md"
          style={{ transform: "translateX(8px) translateY(-50%) rotate(6deg)" }}
        >
          <DocumentIcon />
        </div>

        {/* Center document with scan line */}
        <div className="relative z-10 flex h-28 w-20 flex-col overflow-hidden rounded-lg border-2 border-indigo-200/90 bg-white shadow-xl shadow-indigo-100/50">
          {/* Document lines */}
          <div className="absolute inset-0 flex flex-col justify-evenly px-2 py-2">
            {[1, 2, 3, 4, 5, 6].map((j) => (
              <div key={j} className="h-0.5 rounded-full bg-slate-200/70" style={{ width: j % 2 === 0 ? "100%" : "75%", marginLeft: j % 2 === 0 ? "0" : "8%" }} />
            ))}
          </div>
          {/* Scanning line */}
          <div
            className="animate-doc-scan absolute left-0 right-0 h-1 rounded-full bg-gradient-to-r from-transparent via-indigo-500 to-transparent"
            style={{ boxShadow: "0 0 12px 2px rgba(99, 102, 241, 0.5)" }}
          />
        </div>
      </div>

      {/* Step pills */}
      <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
        {["Reading", "Extracting", "Scoring", "Building"].map((step, i) => (
          <span
            key={step}
            className="animate-doc-step flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm ring-1 ring-slate-200/60"
            style={{ animationDelay: `${i * 0.25}s` }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full bg-indigo-500"
              style={{ animation: "doc-analyzer-step 2s ease-in-out infinite", animationDelay: `${i * 0.25}s` }}
            />
            {step}
          </span>
        ))}
      </div>

      <p className="text-center text-sm font-semibold text-slate-800">{title}</p>
      {subtitle && <p className="mt-1 max-w-sm text-center text-xs text-slate-500">{subtitle}</p>}
    </div>
  );
}

function DocumentIcon() {
  return (
    <svg className="h-8 w-6 text-slate-400/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5v-7.5H8.25v7.5z" />
    </svg>
  );
}
