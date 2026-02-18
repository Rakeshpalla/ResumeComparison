import { isAdminAuthenticated } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { toFeedbackRow } from "@/lib/feedback-db";
import type { FeedbackRow } from "@/lib/feedback-db";
import { AdminLoginForm } from "./AdminLoginForm";
import { AdminDashboard } from "./AdminDashboard";

/**
 * Protected admin feedback dashboard. Server component: checks auth and fetches data from Neon (Prisma).
 */
export default async function AdminFeedbackPage() {
  const authenticated = await isAdminAuthenticated();
  if (!authenticated) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <AdminLoginForm />
      </div>
    );
  }

  let rows: FeedbackRow[] = [];
  try {
    const list = await prisma.feedbackResponse.findMany({
      orderBy: { createdAt: "desc" },
    });
    rows = list.map(toFeedbackRow);
  } catch (e) {
    console.error("Admin feedback fetch error:", e);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <AdminDashboard initialRows={rows} />
    </div>
  );
}
