"use client";

import Link from "next/link";
import { ThankYouCard } from "@/components/feedback/ThankYouCard";

/**
 * Client wrapper for thank-you page: personalized tip and share.
 */
export function ThankYouContent({ usefulnessRating }: { usefulnessRating: number }) {
  return (
    <div className="mx-auto max-w-xl py-6">
      <div className="mb-6">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-400 transition-colors hover:text-indigo-300">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to app
        </Link>
      </div>
      <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-6 backdrop-blur-sm sm:p-8">
        <ThankYouCard usefulnessRating={usefulnessRating} />
      </div>
    </div>
  );
}
