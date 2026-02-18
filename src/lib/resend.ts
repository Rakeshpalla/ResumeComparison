import { Resend } from "resend";
import type { FeedbackFormData } from "./validations/feedback";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "Resume Comparison Engine <onboarding@resend.dev>";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/**
 * Sends the value-delivery email to the user after feedback submission.
 * Subject: "Your hiring insight from Resume Comparison Engine"
 */
export async function sendUserFeedbackEmail(
  email: string,
  _payload: FeedbackFormData
): Promise<{ error: Error | null }> {
  if (!resend) return { error: new Error("RESEND_API_KEY not set") };

  const html = `
    <div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto;">
      <h2 style="color: #1e293b;">Your hiring insight from Resume Comparison Engine</h2>
      <p>Thanks for your feedback — here are 3 practical tips to get more from resume comparisons:</p>
      <ol style="line-height: 1.8;">
        <li><strong>Define criteria first.</strong> Before you upload resumes, jot down 3–5 must-haves for the role. Use our comparison output to score candidates against these explicitly.</li>
        <li><strong>Use the scoring matrix as an interview scorecard.</strong> Map our "strengths & weaknesses" to structured interview questions so you reduce bias and stay consistent.</li>
        <li><strong>Re-run with a job description when you can.</strong> Adding context (even pasted in notes) sharpens fit scores and recommendations.</li>
      </ol>
      <p>
        <a href="${APP_URL}" style="color: #4f46e5; font-weight: 600;">Back to Resume Comparison Engine →</a>
      </p>
      <p style="color: #64748b; font-size: 14px;">One useful email — no spam, ever.</p>
    </div>
  `;

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Your hiring insight from Resume Comparison Engine",
    html,
  });
  return { error: error ? new Error(error.message) : null };
}

/**
 * Sends admin notification with a summary of the submission.
 */
export async function sendAdminFeedbackNotification(
  payload: FeedbackFormData & { email?: string | null | undefined }
): Promise<{ error: Error | null }> {
  if (!resend || !ADMIN_EMAIL) return { error: new Error("RESEND_API_KEY or ADMIN_EMAIL not set") };

  const summary = [
    `Role: ${payload.role}`,
    `Resumes/role: ${payload.resumes_per_role}`,
    `Previous method: ${payload.previous_method}`,
    `Pain point: ${payload.pain_point.slice(0, 200)}${payload.pain_point.length > 200 ? "…" : ""}`,
    `Usefulness: ${payload.usefulness_rating}/5`,
    `Valuable: ${payload.valuable_features.join(", ")}`,
    `Confidence: ${payload.confidence_after}`,
    `Would recommend: ${payload.would_recommend}`,
    payload.email ? `Email: ${payload.email}` : "Email: (not provided)",
  ].join("<br/>");

  const html = `
    <div style="font-family: system-ui, sans-serif;">
      <h2 style="color: #1e293b;">New feedback submission</h2>
      <div style="background: #f1f5f9; padding: 16px; border-radius: 8px;">
        ${summary}
      </div>
    </div>
  `;

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: ADMIN_EMAIL,
    subject: `[Feedback] ${payload.role} – ${payload.usefulness_rating}/5`,
    html,
  });
  return { error: error ? new Error(error.message) : null };
}
