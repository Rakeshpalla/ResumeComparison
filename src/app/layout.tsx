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
  themeColor: "#4f46e5",
};

export const metadata = {
  ...buildMetadata({
    title: "HireSignal | AI Resume Screening for Recruiters",
    description:
      "AI-powered resume screening for solo recruiters. Upload up to 25 candidates, get a structured shortlist in seconds. Free to use, no credit card required.",
    path: "/",
  }),
  metadataBase: new URL(getBaseUrl()),
  manifest: "/site.webmanifest",
  appleWebApp: {
    capable: true,
    title: "HireSignal",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
};

const FAQ_DATA = [
  { question: "How many resumes can I compare at once?", answer: "You can compare 2 to 25 resumes at once. Upload PDF or DOCX files and get a side-by-side AI-powered ranking with export to Excel." },
  { question: "Do I need to create an account?", answer: "No. HireSignal works without signup. Just upload your resumes and optional job description to get started." },
  { question: "Is HireSignal free?", answer: "Yes. The free tier lets you compare up to 5 resumes per session, with no credit card required. A Pro tier with unlimited comparisons is coming soon." },
  { question: "Who is this tool for?", answer: "Solo recruiters, hiring managers, and startup founders who need to shortlist candidates quickly with a structured, consistent comparison." },
  { question: "Can I paste a job description?", answer: "Yes. Adding a job description improves keyword fit scores, gap detection, and interview-style questions tailored to your role." },
  { question: "What file formats are supported?", answer: "PDF and Microsoft Word (.docx) resumes are supported. Upload between two and twenty-five files per comparison session." },
];

export default function RootLayout({ children }: { children: ReactNode }) {
  const schemas = [organizationSchema(), webSiteSchema(), softwareApplicationSchema(), faqSchema(FAQ_DATA)];
  return (
    <html lang="en">
      <head>
        <StructuredData data={schemas} />
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://www.google-analytics.com" />
        {/* Landing page fonts: display (headlines), body */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <link rel="alternate" type="text/plain" title="LLM site summary" href={`${getBaseUrl()}/llms.txt`} />
      </head>
      <body>
        <div className="min-h-screen">{children}</div>
        <Analytics />
      </body>
    </html>
  );
}
