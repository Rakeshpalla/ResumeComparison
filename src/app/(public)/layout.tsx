import type { ReactNode } from "react";
import Link from "next/link";
import { Footer } from "../../components/Footer";
import { buildMetadata } from "../../lib/metadata";

export const metadata = buildMetadata({
  title: "Resume Comparison Engine",
  description:
    "Consulting-grade resume comparison. Compare 2-5 resumes (PDF/DOCX) and get hiring insights. Make better hiring decisions, faster.",
});

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#1d1d1f]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 shadow-lg shadow-indigo-500/20">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="hidden sm:block">
              <div className="font-display text-lg font-bold text-white">
                Resume Comparison Engine
              </div>
              <div className="mt-0.5 text-xs font-medium text-slate-300">
                Make better hiring decisions, faster
              </div>
            </div>
            <div className="sm:hidden">
              <div className="font-display text-base font-bold text-white">RCE</div>
            </div>
          </Link>
        </div>
      </header>
      <main className="mx-auto flex min-h-[calc(100vh-73px)] max-w-7xl flex-col bg-[#1d1d1f] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">{children}</main>
      <Footer />
    </>
  );
}
