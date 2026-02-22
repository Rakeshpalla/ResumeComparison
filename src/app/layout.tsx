/**
 * Root layout: SEO (metadata, viewport), JSON-LD, analytics.
 * All pages inherit canonical, OG, Twitter, robots from buildMetadata in layouts.
 */
import "./globals.css";
import type { ReactNode } from "react";
import type { Viewport } from "next";
import { buildMetadata, getBaseUrl } from "../lib/metadata";
import { organizationSchema, webSiteSchema, softwareApplicationSchema, faqSchema } from "../lib/structured-data";
import { StructuredData } from "../components/StructuredData";
import { Analytics } from "../components/Analytics";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#312e81",
};

export const metadata = {
  ...buildMetadata({
    title: "Resume Comparison Engine",
    description:
      "Free resume comparison tool. Compare 2-5 resumes side-by-side in minutes. Used by hiring managers and recruiters to shortlist candidates and reduce bias. No signup required.",
    path: "/",
  }),
  metadataBase: new URL(getBaseUrl()),
  alternates: { canonical: getBaseUrl() },
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
};

const FAQ_DATA = [
  { question: "How many resumes can I compare at once?", answer: "You can compare 2 to 5 resumes at once. Upload PDF or DOCX files and get a side-by-side analysis with ranking and export to Excel." },
  { question: "Do I need to create an account?", answer: "No. Resume Comparison Engine works without signup. Just upload your resumes and optional job description to get started." },
  { question: "Is Resume Comparison Engine free?", answer: "Yes. The tool is free to use for comparing resumes, with optional Excel export and hiring insights." },
  { question: "Who is this tool for?", answer: "Hiring managers, recruiters, and anyone who needs to shortlist candidates quickly with a structured, consistent comparison." },
];

export default function RootLayout({ children }: { children: ReactNode }) {
  const schemas = [organizationSchema(), webSiteSchema(), softwareApplicationSchema(), faqSchema(FAQ_DATA)];
  return (
    <html lang="en">
      <head>
        <StructuredData data={schemas} />
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://www.google-analytics.com" />
      </head>
      <body>
        <div className="min-h-screen bg-slate-50">{children}</div>
        <Analytics />
      </body>
    </html>
  );
}
