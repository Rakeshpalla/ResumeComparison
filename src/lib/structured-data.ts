/**
 * SEO: JSON-LD structured data (Organization, WebSite, SoftwareApplication, BreadcrumbList, FAQPage).
 * Injected in <head> via StructuredData component for search engines and rich results.
 */
import { getBaseUrl } from "./metadata";

const SITE_NAME = "Resume Comparison Engine";

export function organizationSchema() {
  const baseUrl = getBaseUrl();
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: baseUrl,
    description: "Free resume comparison tool. Compare 2-5 resumes (PDF/DOCX) side-by-side in minutes. Used by hiring managers and recruiters to shortlist candidates and reduce bias.",
    sameAs: [
      process.env.NEXT_PUBLIC_TWITTER_URL,
      process.env.NEXT_PUBLIC_LINKEDIN_URL,
      process.env.NEXT_PUBLIC_FACEBOOK_URL,
    ].filter(Boolean) as string[],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "Customer Service",
      url: `${baseUrl}/feedback`,
    },
  };
}

export function webSiteSchema() {
  const baseUrl = getBaseUrl();
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: baseUrl,
    description: "Free resume comparison tool. Upload 2-5 resumes, get side-by-side analysis, scoring, and hiring recommendations in minutes. Trusted by hiring managers and recruiters.",
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${baseUrl}/upload` },
      "query-input": "required name=search_term_string",
    },
  };
}

export function softwareApplicationSchema() {
  const baseUrl = getBaseUrl();
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: baseUrl,
    description: "Compare 2-5 resumes in minutes. Side-by-side analysis, skills gap detection, scoring, and hiring recommendations. Free. Used by hiring managers and recruiters to shortlist candidates and reduce bias.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    featureList: [
      "Compare 2-5 resumes (PDF/DOCX) at once",
      "Side-by-side analysis and smart ranking",
      "Skills gap and fit scoring",
      "Hiring recommendations",
      "Reduce bias in shortlisting",
    ],
  };
}

export function breadcrumbSchema(items: { name: string; path: string }[]) {
  const baseUrl = getBaseUrl();
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${baseUrl}${item.path}`,
    })),
  };
}

export function faqSchema(faq: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((q) => ({
      "@type": "Question",
      name: q.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: q.answer,
      },
    })),
  };
}
