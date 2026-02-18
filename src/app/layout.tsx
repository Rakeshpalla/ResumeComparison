import "./globals.css";
import type { ReactNode } from "react";
import { buildMetadata, getBaseUrl } from "../lib/metadata";
import { organizationSchema, webSiteSchema, softwareApplicationSchema } from "../lib/structured-data";
import { StructuredData } from "../components/StructuredData";
import { Analytics } from "../components/Analytics";

export const metadata = {
  ...buildMetadata({
    title: "Resume Comparison Engine",
    description:
      "Compare 2-5 resumes in minutes, not hours. AI-powered side-by-side analysis trusted by hiring managers. Free. Reduce bias, shortlist with confidence.",
    path: "/",
  }),
  metadataBase: new URL(getBaseUrl()),
  alternates: { canonical: getBaseUrl() },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const schemas = [organizationSchema(), webSiteSchema(), softwareApplicationSchema()];
  return (
    <html lang="en">
      <head>
        <StructuredData data={schemas} />
      </head>
      <body>
        <div className="min-h-screen bg-slate-50">{children}</div>
        <Analytics />
      </body>
    </html>
  );
}
