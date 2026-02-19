import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { buildMetadata } from "../../../lib/metadata";

export const metadata = buildMetadata({
  title: "Sign In",
  description:
    "Sign in to Resume Comparison Engine. Compare 2-5 resumes (PDF/DOCX) and get structured analysis.",
  path: "/login",
});

export default function LoginLayout({ children }: { children: ReactNode }) {
  if (process.env.REQUIRE_LOGIN !== "true") {
    redirect("/upload");
  }
  return <>{children}</>;
}
