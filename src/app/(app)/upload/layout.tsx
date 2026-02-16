import type { ReactNode } from "react";
import { buildMetadata } from "../../../lib/metadata";

export const metadata = buildMetadata({
  title: "Upload Resumes",
  description:
    "Upload 2-5 resumes (PDF or DOCX) and optional job description. Get side-by-side comparison and hiring insights.",
  path: "/upload",
});

export default function UploadLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
