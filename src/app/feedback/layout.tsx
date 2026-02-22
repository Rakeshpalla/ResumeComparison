/**
 * Feedback layout: SEO metadata, BreadcrumbList JSON-LD, header/footer.
 */
import type { ReactNode } from "react";
import Link from "next/link";
import { buildMetadata } from "../../lib/metadata";
import { breadcrumbSchema } from "../../lib/structured-data";
import { StructuredData } from "@/components/StructuredData";
import { Footer } from "@/components/Footer";

export const metadata = buildMetadata({
  title: "Feedback",
  description:
    "Share feedback on Resume Comparison Engine. Help us improve the tool for hiring managers and recruiters.",
  path: "/feedback",
});

const FEEDBACK_BREADCRUMB = breadcrumbSchema([
  { name: "Home", path: "/" },
  { name: "Feedback", path: "/feedback" },
]);

export default function FeedbackLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <StructuredData data={FEEDBACK_BREADCRUMB} />
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-xl shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <div className="text-lg font-bold text-slate-900">Resume Comparison Engine</div>
              <div className="mt-0.5 hidden text-xs font-medium text-slate-500 sm:block">Make better hiring decisions, faster</div>
            </div>
          </Link>
        </div>
      </header>
      <main className="mx-auto flex min-h-[calc(100vh-73px)] max-w-7xl flex-col px-4 py-8 sm:px-6 lg:px-8">{children}</main>
      <Footer />
    </>
  );
}
