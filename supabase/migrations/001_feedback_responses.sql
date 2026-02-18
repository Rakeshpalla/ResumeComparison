-- Feedback form responses for Resume Comparison Engine
-- Run this migration in your Supabase SQL editor or via Supabase CLI

CREATE TABLE IF NOT EXISTS feedback_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now() NOT NULL,
  role text,
  resumes_per_role text,
  previous_method text,
  pain_point text,
  usefulness_rating integer,
  valuable_features text[],
  confidence_after text,
  missing_features text[],
  missing_other text,
  open_feedback text,
  disappear_reaction text,
  would_recommend text,
  email text
);

-- Constrain usefulness_rating to 1-5
ALTER TABLE feedback_responses
  ADD CONSTRAINT chk_usefulness_rating
  CHECK (usefulness_rating IS NULL OR (usefulness_rating >= 1 AND usefulness_rating <= 5));

-- Enable Row Level Security
ALTER TABLE feedback_responses ENABLE ROW LEVEL SECURITY;

-- Policy: allow insert for anon (public form submissions)
CREATE POLICY "allow_anon_insert"
  ON feedback_responses
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Policy: allow select for authenticated only (admin reads via service role key)
-- Service role bypasses RLS by default; this policy is for authenticated users if you use Supabase Auth.
CREATE POLICY "allow_authenticated_select"
  ON feedback_responses
  FOR SELECT
  TO authenticated
  USING (true);

-- Optional: allow service role to do everything (Supabase service role typically bypasses RLS)
-- If your admin uses service role key from API routes, no extra policy is needed for SELECT.

COMMENT ON TABLE feedback_responses IS 'Product feedback from the /feedback form (Resume Comparison Engine)';
