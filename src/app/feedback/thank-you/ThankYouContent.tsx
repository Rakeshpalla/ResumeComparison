"use client";

import Link from "next/link";
import { ThankYouCard } from "@/components/feedback/ThankYouCard";

/**
 * Client wrapper for thank-you page: personalized tip and share.
 */
export function ThankYouContent({
  usefulnessRating,
  email,
  emailSent,
}: {
  usefulnessRating: number;
  email?: string;
  emailSent?: boolean;
}) {
  const name = email ? email.split("@")[0] : null;
  return (
    <div className="mx-auto max-w-xl py-8">
      <div className="mb-8">
        <Link href="/" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
          ← Back to app
        </Link>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <ThankYouCard
          name={name}
          usefulnessRating={usefulnessRating}
          emailSent={emailSent}
        />
      </div>
    </div>
  );
}
