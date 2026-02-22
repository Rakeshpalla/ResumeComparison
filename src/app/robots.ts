/**
 * SEO: robots.txt. Allow all crawlers, point to sitemap, disallow API and session-specific compare routes.
 * Served at /robots.txt.
 */
import type { MetadataRoute } from "next";
import { getBaseUrl } from "../lib/metadata";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getBaseUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/auth/", "/compare/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
