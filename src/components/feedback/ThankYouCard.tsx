"use client";

/**
 * Thank You card: personalized tip by rating and social share.
 */
export function ThankYouCard({
  name,
  usefulnessRating,
  emailSent,
}: {
  name?: string | null;
  usefulnessRating: number;
  /** True if we actually sent the tips email (Resend configured and send succeeded). */
  emailSent?: boolean;
}) {
  const tipBlock = getTipBlock(usefulnessRating);
  const shareUrl = typeof window !== "undefined" ? window.location.origin + "/feedback" : "";
  const tweetText = `I just tried the Resume Comparison Engine — compare 2-5 resumes with AI. Worth a look for hiring managers.`;
  const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(shareUrl)}`;

  const thanksMessage = name
    ? emailSent
      ? "We've sent a short email with practical tips to your inbox (check spam if you don't see it)."
      : "Your feedback was saved. We couldn't send the tips email this time — your response is still recorded."
    : "Your feedback helps us build a better tool.";

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">
          {name ? `Thanks, ${name.split("@")[0]}!` : "Thank you!"}
        </h3>
        <p className="mt-2 text-slate-600">{thanksMessage}</p>
      </div>

      <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-6">
        <h4 className="font-semibold text-indigo-900">Your personalized tip</h4>
        <p className="mt-2 text-indigo-800">{tipBlock}</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="mb-3 text-sm font-medium text-slate-700">
          Help other hiring managers discover this →
        </p>
        <a
          href={tweetUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-[#1DA1F2] px-4 py-2 text-sm font-medium text-white hover:bg-[#1a8cd8]"
        >
          Share on X (Twitter)
        </a>
      </div>
    </div>
  );
}

/**
 * Returns the tip copy based on usefulness rating (Q5).
 */
function getTipBlock(rating: number): string {
  if (rating >= 4) {
    return "Pro tip: Use the candidate scoring matrix to build a structured interview scorecard — it reduces bias by 40%.";
  }
  if (rating >= 2) {
    return "We're improving the comparison depth. In the meantime, try uploading a job description alongside resumes for sharper results.";
  }
  return "We're sorry it didn't land. Would you be open to a 5-min call so we can fix this for you? Book a time here: https://calendly.com (placeholder).";
}
