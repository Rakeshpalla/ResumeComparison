import type { FeedbackResponse } from "@prisma/client";

/**
 * Shape expected by admin dashboard (snake_case). Map from Prisma model (camelCase).
 */
export type FeedbackRow = {
  id: string;
  created_at: string;
  role: string | null;
  resumes_per_role: string | null;
  previous_method: string | null;
  pain_point: string | null;
  usefulness_rating: number | null;
  valuable_features: string[] | null;
  confidence_after: string | null;
  missing_features: string[] | null;
  missing_other: string | null;
  open_feedback: string | null;
  disappear_reaction: string | null;
  would_recommend: string | null;
  email: string | null;
};

/** Convert Prisma FeedbackResponse to FeedbackRow for admin UI. */
export function toFeedbackRow(r: FeedbackResponse): FeedbackRow {
  return {
    id: r.id,
    created_at: r.createdAt.toISOString(),
    role: r.role,
    resumes_per_role: r.resumesPerRole,
    previous_method: r.previousMethod,
    pain_point: r.painPoint,
    usefulness_rating: r.usefulnessRating,
    valuable_features: r.valuableFeatures.length ? r.valuableFeatures : null,
    confidence_after: r.confidenceAfter,
    missing_features: r.missingFeatures.length ? r.missingFeatures : null,
    missing_other: r.missingOther,
    open_feedback: r.openFeedback,
    disappear_reaction: r.disappearReaction,
    would_recommend: r.wouldRecommend,
    email: r.email,
  };
}
