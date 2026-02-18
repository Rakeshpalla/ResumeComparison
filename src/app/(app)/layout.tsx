import type { ReactNode } from "react";
import Link from "next/link";
import { Footer } from "../../components/Footer";
import { HeaderActions } from "../../components/HeaderActions";
import { buildMetadata } from "../../lib/metadata";

export const metadata = buildMetadata({
  title: "Dashboard",
  description:
    "Upload resumes and compare candidates. Consulting-grade resume comparison tool.",
});

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="hidden sm:block">
              <div className="text-lg font-bold text-slate-900">
                Resume Comparison Engine
              </div>
              <div className="mt-0.5 text-xs font-medium text-slate-500">
                Make better hiring decisions, faster
              </div>
            </div>
            <div className="sm:hidden">
              <div className="text-base font-bold text-slate-900">RCE</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <HeaderActions />
          </div>
        </div>
      </header>
      <div className="border-b border-indigo-100 bg-indigo-50/80 py-2 text-center text-sm">
        <Link
          href="/feedback"
          className="font-medium text-indigo-700 hover:text-indigo-800 hover:underline"
        >
          Love this tool? Give us 30 seconds of feedback →
        </Link>
      </div>
      <main className="mx-auto flex min-h-[calc(100vh-73px)] max-w-7xl flex-col px-4 py-6 sm:px-6 sm:py-8 lg:px-8">{children}</main>
      <Footer />
    </>
  );
}