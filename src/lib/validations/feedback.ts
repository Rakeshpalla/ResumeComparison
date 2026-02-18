import { z } from "zod";

/** Role options for Q1 */
export const ROLE_OPTIONS = [
  "Hiring Manager",
  "Recruiter / Talent Acquisition",
  "HR Professional",
  "Founder / Small Business Owner",
  "Other",
] as const;

/** Resumes per role options for Q2 */
export const RESUMES_PER_ROLE_OPTIONS = [
  "Fewer than 10",
  "10–30",
  "30–75",
  "75+",
] as const;

/** Previous comparison method for Q3 */
export const PREVIOUS_METHOD_OPTIONS = [
  "Spreadsheet / manual notes",
  "Side-by-side in separate tabs",
  "ATS built-in tools",
  "I wasn't comparing systematically",
  "Other",
] as const;

/** Valuable features for Q6 (multi-select) */
export const VALUABLE_FEATURES_OPTIONS = [
  "Skills gap analysis",
  "Side-by-side candidate scoring",
  "Hiring recommendation summary",
  "Fit score / ranking",
  "Specific strengths & weaknesses per candidate",
  "None of the above",
] as const;

/** Confidence after using tool for Q7 */
export const CONFIDENCE_OPTIONS = [
  "Much more confident",
  "Somewhat more confident",
  "About the same",
  "Less confident",
] as const;

/** Missing features for Q8 (multi-select) */
export const MISSING_FEATURES_OPTIONS = [
  "ATS integration (Greenhouse, Lever, Workday)",
  "Job description matching / fit score against JD",
  "Candidate ranking by custom criteria",
  "Collaboration (share results with team)",
  "Export to PDF / Word",
  "Interview question suggestions per candidate",
  "Bias detection",
  "Something else",
] as const;

/** Reaction if tool disappeared for Q10 */
export const DISAPPEAR_OPTIONS = [
  "Go back to my old manual process (ugh)",
  "Look for an alternative tool",
  "Build something myself",
  "I'd barely notice",
] as const;

/** Would recommend for Q11 */
export const WOULD_RECOMMEND_OPTIONS = [
  "Definitely yes",
  "Probably yes",
  "Not sure",
  "Probably not",
  "Definitely not",
] as const;

/**
 * Zod schema for feedback form submission.
 * Matches Supabase feedback_responses table.
 */
export const feedbackFormSchema = z.object({
  role: z.enum(ROLE_OPTIONS),
  resumes_per_role: z.enum(RESUMES_PER_ROLE_OPTIONS),
  previous_method: z.enum(PREVIOUS_METHOD_OPTIONS),
  pain_point: z.string().min(1, "Required").max(300),
  usefulness_rating: z.number().min(1).max(5),
  valuable_features: z
    .array(z.enum(VALUABLE_FEATURES_OPTIONS))
    .min(1, "Select at least one"),
  confidence_after: z.enum(CONFIDENCE_OPTIONS),
  missing_features: z.array(z.enum(MISSING_FEATURES_OPTIONS)).optional().default([]),
  missing_other: z.string().max(400).optional().default(""),
  open_feedback: z.string().max(400).optional().default(""),
  disappear_reaction: z.enum(DISAPPEAR_OPTIONS),
  would_recommend: z.enum(WOULD_RECOMMEND_OPTIONS),
  email: z.string().email().optional().or(z.literal("")),
});

export type FeedbackFormData = z.infer<typeof feedbackFormSchema>;

/** Type for API/DB row (email as string | null) */
export const feedbackApiSchema = feedbackFormSchema.extend({
  email: z.string().email().optional().nullable(),
});

export type FeedbackApiPayload = z.infer<typeof feedbackApiSchema>;
