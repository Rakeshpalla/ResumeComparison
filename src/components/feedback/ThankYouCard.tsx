"use client";

/**
 * Thank You card: personalized tip by rating and social share.
 */
export function ThankYouCard({ usefulnessRating }: { usefulnessRating: number }) {
  const tipBlock = getTipBlock(usefulnessRating);
  const shareUrl = typeof window !== "undefined" ? window.location.origin + "/feedback" : "";
  const tweetText = `I just tried the Resume Comparison Engine — compare 2–5 resumes side-by-side with smart ranking. Worth a look for hiring managers.`;
  const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(shareUrl)}`;

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-white/10 bg-zinc-800/50 p-5">
        <h3 className="text-lg font-semibold text-white">Thank you!</h3>
        <p className="mt-1 text-zinc-400">Your feedback was saved.</p>
      </div>

      <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-5">
        <h4 className="font-semibold text-indigo-300">Your personalized tip</h4>
        <p className="mt-2 text-indigo-200">{tipBlock}</p>
      </div>

      <div className="rounded-xl border border-white/10 bg-zinc-800/50 p-5">
        <p className="mb-3 text-sm font-medium text-zinc-300">
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
