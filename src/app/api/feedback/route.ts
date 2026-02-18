import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { feedbackFormSchema } from "@/lib/validations/feedback";
import { sendUserFeedbackEmail, sendAdminFeedbackNotification } from "@/lib/resend";

/** Success payload returned so the client can redirect to thank-you page. */
function successPayload(
  data: { usefulness_rating: number; valuable_features: string[] },
  email: string | null,
  emailSent: boolean
) {
  return NextResponse.json({
    success: true,
    usefulness_rating: data.usefulness_rating,
    valuable_features: data.valuable_features,
    email,
    email_sent: emailSent,
  });
}

/**
 * POST /api/feedback
 * Validates body with Zod, inserts into Neon (Prisma), sends emails via Resend (best-effort).
 * Uses the same DATABASE_URL (Neon) as the rest of the app.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = feedbackFormSchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.flatten().fieldErrors;
      const message = Object.values(first).flat().join(" ") || "Validation failed";
      return NextResponse.json({ error: message }, { status: 422 });
    }
    const data = parsed.data;
    const email = data.email?.trim() || null;

    if (typeof prisma.feedbackResponse?.create !== "function") {
      console.error("Prisma client missing feedbackResponse model. Run: npx prisma generate (stop dev server first).");
      return NextResponse.json(
        { error: "Feedback service is not ready. Restart the app: stop the dev server, run 'npx prisma generate', then start it again." },
        { status: 503 }
      );
    }

    await prisma.feedbackResponse.create({
      data: {
        role: data.role,
        resumesPerRole: data.resumes_per_role,
        previousMethod: data.previous_method,
        painPoint: data.pain_point,
        usefulnessRating: data.usefulness_rating,
        valuableFeatures: data.valuable_features,
        confidenceAfter: data.confidence_after,
        missingFeatures: data.missing_features ?? [],
        missingOther: data.missing_other ?? "",
        openFeedback: data.open_feedback ?? "",
        disappearReaction: data.disappear_reaction,
        wouldRecommend: data.would_recommend,
        email,
      },
    });

    const payload = { ...data, email: email ?? undefined };
    let emailSent = false;
    if (email) {
      const { error } = await sendUserFeedbackEmail(email, data);
      if (error) console.error("Feedback user email error:", error);
      else emailSent = true;
    }
    sendAdminFeedbackNotification(payload).then(({ error }) => {
      if (error) console.error("Feedback admin email error:", error);
    });

    return successPayload(data, email, emailSent);
  } catch (e) {
    console.error("Feedback API error:", e);
    return NextResponse.json(
      {
        error:
          e instanceof Error ? e.message : "Something went wrong. Please try again.",
      },
      { status: 500 }
    );
  }
}
