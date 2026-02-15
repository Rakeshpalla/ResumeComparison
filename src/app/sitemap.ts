import type { MetadataRoute } from "next";
import { getBaseUrl } from "../lib/metadata";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getBaseUrl();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/login`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/privacy`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/terms`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
  ];

  // App routes that are reachable without a session (crawlers may not hit these when behind auth)
  const appRoutes: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/upload`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
  ];

  return [...staticRoutes, ...appRoutes];
}
