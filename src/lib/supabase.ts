import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Client for browser / anon usage (e.g. public form submit).
 * Use for inserts from the feedback form (anon policy allows insert).
 */
export function createSupabaseClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  return createClient(supabaseUrl, supabaseAnonKey);
}

/**
 * Server-only client with service role for admin reads.
 * Use in API routes for SELECT on feedback_responses (RLS allows authenticated/service).
 */
export function createSupabaseAdminClient() {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

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
