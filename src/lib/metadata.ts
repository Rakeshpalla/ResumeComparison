/**
 * SEO: Reusable metadata builder for all pages.
 * Provides: title (50-60 chars), meta description (150-160), keywords, canonical,
 * Open Graph (Facebook/LinkedIn/WhatsApp/Discord), Twitter Card, robots, Google/Bing verification.
 * Use buildMetadata({ title, description?, path?, imagePath?, noIndex?, keywords? }) in layouts.
 */
import type { Metadata } from "next";

const SITE_NAME = "Resume Comparison Engine";
const DEFAULT_DESCRIPTION =
  "Free resume comparison tool. Compare 2-5 resumes side-by-side in minutes. Used by hiring managers and recruiters to shortlist candidates, reduce bias, and make better hires. No signup required.";
const TWITTER_HANDLE = process.env.NEXT_PUBLIC_TWITTER_HANDLE || "";
const KEYWORDS = [
  "resume comparison",
  "resume comparison tool",
  "compare resumes online",
  "free resume comparison",
  "hiring manager tool",
  "candidate comparison",
  "resume ranking",
  "shortlist candidates",
  "resume analysis",
  "compare resumes side by side",
  "resume screening tool",
  "hire better",
  "recruiter tool",
  "consulting-grade hiring",
  "reduce hiring bias",
  "resume scoring",
  "resume comparison for hiring",
  "compare candidate resumes",
];

const TITLE_MAX_LENGTH = 60;
const DESCRIPTION_MAX_LENGTH = 160;

export function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "https://resumecomparison.vercel.app";
}

/**
 * Build SEO metadata for a page. Accepts title, description, path, imagePath, noIndex, keywords.
 * Ensures title 50-60 chars, description 150-160 chars, canonical, OG, Twitter, robots, verification.
 */
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
  const fullTitle = path ? `${title} | ${SITE_NAME}` : `${title} - ${SITE_NAME}`;
  const metaTitle = fullTitle.slice(0, TITLE_MAX_LENGTH);
  const metaDescription = description.slice(0, DESCRIPTION_MAX_LENGTH);
  const ogImage = imagePath
    ? `${baseUrl}${imagePath.startsWith("/") ? imagePath : `/${imagePath}`}`
    : `${baseUrl}/api/og?title=${encodeURIComponent(title)}`;

  const verification: Metadata["verification"] = {};
  if (process.env.GOOGLE_VERIFICATION_CODE) {
    verification.google = process.env.GOOGLE_VERIFICATION_CODE;
  }
  if (process.env.BING_VERIFICATION_CODE) {
    verification.other = { "msvalidate.01": process.env.BING_VERIFICATION_CODE };
  }

  return {
    title: metaTitle,
    description: metaDescription,
    keywords: keywords,
    authors: [{ name: SITE_NAME, url: baseUrl }],
    creator: SITE_NAME,
    alternates: path !== undefined ? { canonical: url } : undefined,
    openGraph: {
      title: title,
      description: metaDescription,
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
      description: metaDescription,
      ...(TWITTER_HANDLE ? { creator: TWITTER_HANDLE, site: TWITTER_HANDLE } : {}),
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
    ...(Object.keys(verification).length > 0 ? { verification } : {}),
  };
}

export { SITE_NAME, DEFAULT_DESCRIPTION, KEYWORDS };
