import type { Metadata } from "next";

const SITE_NAME = "Resume Comparison Engine";
const DEFAULT_DESCRIPTION =
  "Consulting-grade resume comparison tool. Compare 2-5 resumes (PDF/DOCX), get structured analysis, and export decision-ready Excel reports with executive scorecards and hiring insights.";
const TWITTER_HANDLE = process.env.NEXT_PUBLIC_TWITTER_HANDLE || "";
const KEYWORDS = [
  "resume comparison",
  "hire better",
  "candidate comparison",
  "resume analysis",
  "hiring tool",
  "Excel export",
  "consulting-grade",
  "side-by-side resumes"
];

export function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "https://resumecomparison.vercel.app";
}

export function buildMetadata(params: {
  title: string;
  description?: string;
  path?: string;
  imagePath?: string;
  noIndex?: boolean;
  keywords?: string[];
}): Metadata {
  const { title, description = DEFAULT_DESCRIPTION, path = "", imagePath, noIndex = false, keywords = KEYWORDS } = params;
  const baseUrl = getBaseUrl();
  const url = path ? `${baseUrl}${path.startsWith("/") ? path : `/${path}`}` : baseUrl;
  const ogImage = imagePath
    ? `${baseUrl}${imagePath.startsWith("/") ? imagePath : `/${imagePath}`}`
    : `${baseUrl}/api/og?title=${encodeURIComponent(title)}`;

  return {
    title: path ? `${title} | ${SITE_NAME}` : `${title} - ${SITE_NAME}`,
    description: description.slice(0, 160),
    keywords: keywords,
    authors: [{ name: SITE_NAME, url: baseUrl }],
    creator: SITE_NAME,
    openGraph: {
      title: title,
      description: description.slice(0, 160),
      url,
      siteName: SITE_NAME,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: title,
      description: description.slice(0, 160),
      ...(TWITTER_HANDLE ? { creator: TWITTER_HANDLE } : {}),
      images: [ogImage],
    },
    robots: noIndex
      ? { index: false, follow: false }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-video-preview": -1,
            "max-image-preview": "large" as const,
            "max-snippet": -1,
          },
        },
    ...(process.env.GOOGLE_VERIFICATION_CODE
      ? { verification: { google: process.env.GOOGLE_VERIFICATION_CODE } }
      : {}),
  };
}

export { SITE_NAME, DEFAULT_DESCRIPTION, KEYWORDS };
