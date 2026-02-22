# SEO Audit & Enhancements Summary

This document summarizes the SEO and discoverability improvements applied across the portal. **Existing functionality and implementation were preserved;** all changes are additive or refinements to metadata and structure.

---

## 1. Core SEO Meta Tags (Every Page)

| Item | Implementation |
|------|----------------|
| **Title** | 50–60 chars via `buildMetadata()`; `metaTitle = fullTitle.slice(0, TITLE_MAX_LENGTH)`. |
| **Meta description** | 150–160 chars; `description.slice(0, DESCRIPTION_MAX_LENGTH)`. |
| **Meta keywords** | Set in `metadata.ts`; overridable per page. |
| **Canonical URL** | `alternates.canonical` set from `path` in `buildMetadata()`. |
| **Robots** | `index, follow` by default; `noIndex: true` for no-index pages. |
| **Viewport** | Exported in root `layout.tsx`: `width: device-width`, `initialScale: 1`, `themeColor`. |
| **Charset** | Handled by Next.js (UTF-8). |

All pages that use `buildMetadata()` in their layout get these tags. SSR-rendered via Next.js Metadata API.

---

## 2. Open Graph (Facebook, LinkedIn, WhatsApp, Discord)

| Tag | Implementation |
|-----|----------------|
| og:title | From `title` param. |
| og:description | Same as meta description (≤160 chars). |
| og:image | 1200×630 from `/api/og` or custom `imagePath`. |
| og:url | Canonical URL for the page. |
| og:type | `website`. |
| og:site_name | `Resume Comparison Engine`. |
| og:locale | `en_US`. |

Defined in `src/lib/metadata.ts` → `buildMetadata()` → `openGraph`.

---

## 3. Twitter / X Card Tags

| Tag | Implementation |
|-----|----------------|
| twitter:card | `summary_large_image`. |
| twitter:title | From `title` param. |
| twitter:description | Same as meta description. |
| twitter:image | Same as OG image. |
| twitter:site | From `NEXT_PUBLIC_TWITTER_HANDLE` when set. |
| twitter:creator | From `NEXT_PUBLIC_TWITTER_HANDLE` when set. |

Defined in `src/lib/metadata.ts` → `buildMetadata()` → `twitter`.

---

## 4. Structured Data (JSON-LD)

| Schema | Where | Purpose |
|--------|--------|--------|
| **Organization** | Root layout | Brand, URL, sameAs, contactPoint. |
| **WebSite** | Root layout | Name, URL, SearchAction (target `/upload`). |
| **SoftwareApplication** | Root layout | Category, features, free offer. |
| **FAQPage** | Root layout | FAQ rich results in search. |
| **BreadcrumbList** | Upload layout, Feedback layout | Breadcrumb rich results. |

All injected in `<head>` via `StructuredData` component with `type="application/ld+json"`. No LocalBusiness schema (not applicable).

---

## 5. Technical SEO

| Item | Implementation |
|------|----------------|
| **sitemap.xml** | `src/app/sitemap.ts` → served at `/sitemap.xml`. All main routes included. |
| **robots.txt** | `src/app/robots.ts` → allow `/`, disallow `/api/`, `/auth/`, `/compare/`, sitemap and host set. |
| **hreflang** | Not added (single language). |
| **Images** | No `<img>` in app; SVGs are decorative. Alt/aria handled where needed. |
| **Internal links** | Next.js `<Link>` used throughout (renders as `<a href>`). |
| **Mobile** | Viewport meta set; layout is responsive (Tailwind). |
| **preconnect / dns-prefetch** | Root layout: `preconnect` to googletagmanager, `dns-prefetch` to google-analytics. |

---

## 6. Performance (Core Web Vitals)

| Item | Implementation |
|------|----------------|
| **preload** | Critical assets handled by Next.js. Preconnect added for GA/GTM. |
| **Images** | OG image generated server-side (no client image bloat). `icon.png` in app. |
| **Lazy loading** | Next.js and browser defaults for below-fold content. |
| **LCP/CLS/FID** | No layout shifts from meta; viewport and responsive layout support stability. |

---

## 7. Social Media Discoverability

- **OG image & title** used for link previews (Instagram/TikTok bios, LinkedIn, Facebook, etc.).
- **og:description** is written to work as a short caption when the link is shared.
- **LinkedIn** uses same OG tags; image is 1200×630 (acceptable for LinkedIn).
- **Pinterest** rich pin: set `NEXT_PUBLIC_PINTEREST_RICH_PIN=true` and add `<meta name="pinterest-rich-pin" content="true" />` if needed (e.g. via custom head or middleware); schema already supports Article/Product-style data.

---

## 8. Google

| Item | Implementation |
|-----|----------------|
| **Search Console verification** | Set `GOOGLE_VERIFICATION_CODE` in env → `<meta name="google-site-verification" content="..." />`. |
| **GA4** | Already integrated via `Analytics` component when `NEXT_PUBLIC_GA_ID` is set. |

---

## 9. Bing

| Item | Implementation |
|-----|----------------|
| **Webmaster verification** | Set `BING_VERIFICATION_CODE` in env → `<meta name="msvalidate.01" content="..." />` via `metadata.verification.other`. |

---

## 10. Framework (Next.js)

- **Metadata API** used in every layout that needs SEO (`buildMetadata()`).
- All meta and JSON-LD are **SSR-rendered** (no client-only meta).
- Sitemap and robots are **dynamic routes** (`app/sitemap.ts`, `app/robots.ts`).

---

## 11. Page Speed & Crawlability

- Internal links use **Next.js `<Link>`** → valid `<a href>` with descriptive text.
- No broken links introduced; all routes are reachable from home within a few clicks.
- Sitemap lists all public routes so crawlers can discover them.

---

## Deliverables Checklist

1. **All pages/layouts** use `buildMetadata()` with appropriate title, description, path (and imagePath where needed).
2. **Sitemap** at `/sitemap.xml` (from `app/sitemap.ts`) with all routes.
3. **robots.txt** at `/robots.txt` (from `app/robots.ts`), allow all, point to sitemap.
4. **JSON-LD** on homepage (Organization, WebSite, SoftwareApplication, FAQPage); BreadcrumbList on upload and feedback.
5. **Reusable SEO helper**: `buildMetadata({ title, description?, path?, imagePath?, noIndex?, keywords? })` in `src/lib/metadata.ts`; JSDoc at top of file.
6. **File-top comments** added to: `metadata.ts`, `structured-data.ts`, `layout.tsx` (root), `upload/layout.tsx`, `feedback/layout.tsx`, `sitemap.ts`, `robots.ts`, `(app)/layout.tsx`, `login/layout.tsx`.

---

## Env Vars (Optional)

- `NEXT_PUBLIC_APP_URL` – Used for canonical, OG URL, sitemap (set in production).
- `GOOGLE_VERIFICATION_CODE` – Google Search Console verification.
- `BING_VERIFICATION_CODE` – Bing Webmaster verification.
- `NEXT_PUBLIC_TWITTER_HANDLE` – Twitter card creator/site.

---

## Verification

- `npm run build` (or `npx next build`) completes successfully.
- No existing functionality removed; only SEO and discoverability enhancements added.
