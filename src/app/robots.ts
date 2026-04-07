/**
 * SEO: robots.txt. Allow indexing public pages; block API, auth, and per-session compare URLs.
 * Also repeats rules for common AI/search crawlers (they still inherit "*" if not listed).
 * Optional summary for assistants: /llms.txt
 */
import type { MetadataRoute } from "next";
import { getBaseUrl } from "../lib/metadata";

const DISALLOW = ["/api/", "/auth/", "/compare/"];

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getBaseUrl();
  const allowPublic = {
    allow: "/",
    disallow: DISALLOW,
  };
  return {
    rules: [
      { userAgent: "*", ...allowPublic },
      { userAgent: "GPTBot", ...allowPublic },
      { userAgent: "ChatGPT-User", ...allowPublic },
      { userAgent: "Google-Extended", ...allowPublic },
      { userAgent: "PerplexityBot", ...allowPublic },
      { userAgent: "ClaudeBot", ...allowPublic },
      { userAgent: "anthropic-ai", ...allowPublic },
      { userAgent: "Bytespider", ...allowPublic },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: new URL(baseUrl).origin,
  };
}
