/**
 * Upload layout: SEO metadata (title, description, canonical), BreadcrumbList JSON-LD.
 */
import type { ReactNode } from "react";
import { buildMetadata } from "../../../lib/metadata";
import { breadcrumbSchema } from "../../../lib/structured-data";
import { StructuredData } from "../../../components/StructuredData";

export const metadata = buildMetadata({
  title: "Upload Resumes",
  description:
    "Upload 2-5 resumes (PDF or DOCX) and optional job description. Get side-by-side comparison and hiring insights. No signup.",
  path: "/upload",
});

const UPLOAD_BREADCRUMB = breadcrumbSchema([
  { name: "Home", path: "/" },
  { name: "Upload Resumes", path: "/upload" },
]);

export default function UploadLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <StructuredData data={UPLOAD_BREADCRUMB} />
      {children}
    </>
  );
}
