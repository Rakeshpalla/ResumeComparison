import type { ReactNode } from "react";
import { buildMetadata } from "../../../lib/metadata";

export const metadata = buildMetadata({
  title: "Sign In",
  description:
    "Sign in to Resume Comparison Engine. Compare 2-5 resumes (PDF/DOCX) and get structured analysis.",
  path: "/login",
});

export default function LoginLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
