# SEO & Visibility: Search Engines and Social Media

This doc explains what’s already in place on your site, what you need to do so search engines and social links work correctly, and how visibility on **search** (Google, Bing) differs from **social** (Instagram, TikTok, LinkedIn, Facebook).

---

## What’s Already Done on Your Site

### 1. **SEO tags (meta and Open Graph)**

- **Title & description** – Every page has a unique title and meta description (under 160 characters) with relevant keywords (e.g. “resume comparison”, “compare resumes”, “hiring manager tool”).
- **Canonical URLs** – Each page has a canonical URL so search engines know the main version of the page (avoids duplicate-content issues).
- **Keywords** – A broad set of keywords is set in metadata for discovery.
- **Robots** – Crawling is allowed where it should be; API and session-specific compare URLs are disallowed.

### 2. **Structured data (Schema.org)**

- **Organization** – Name, URL, description, contact (feedback page).
- **WebSite** – Entry point set to `/upload` (main action).
- **SoftwareApplication** – Category, features, free offer.
- **FAQPage** – A few FAQs on the homepage so Google can show rich results (e.g. expandable FAQs in search).

This helps search engines understand your product and can improve how your site appears in results (e.g. with star ratings, FAQs, or sitelinks).

### 3. **Social sharing (when someone shares your link)**

- **Open Graph (OG)** – When your link is shared on **Facebook, LinkedIn, or similar**, they use OG tags to show:
  - Title  
  - Description  
  - Image (from `/api/og` or a custom image)
- **Twitter cards** – When your link is shared on **Twitter/X**, the same info is shown in a card.
- **Image** – OG image is 1200×630 (good for previews).

So: **your site is already set up so that when someone pastes your URL on social or in chat, the preview (title, description, image) looks correct.** That doesn’t by itself make your site “visible” inside Instagram/TikTok/LinkedIn/Facebook; it only makes shared links look good.

### 4. **Sitemap and robots**

- **Sitemap** – `/sitemap.xml` lists the main pages (home, upload, feedback, login, privacy, terms) with priorities and change frequency.
- **Robots** – `/robots.txt` allows crawlers and points to the sitemap. API and session-based compare URLs are disallowed.

---

## What You Must Do for Search Engines (Google, Bing, etc.)

### 1. **Set your real site URL**

In **Vercel** (and in `.env` locally), set:

```env
NEXT_PUBLIC_APP_URL=https://resumemaster-ten.vercel.app
```

(or your custom domain, e.g. `https://www.yourdomain.com`)

This is used for:

- Canonical URLs  
- Open Graph URLs  
- Sitemap URLs  
- Structured data  

If this is wrong or missing, search engines and social platforms may see the wrong or default URL.

### 2. **Submit your sitemap**

- **Google**  
  - Go to [Google Search Console](https://search.google.com/search-console).  
  - Add your property (e.g. `https://resumemaster-ten.vercel.app`).  
  - Verify (e.g. with the HTML tag; set `GOOGLE_VERIFICATION_CODE` in Vercel to the value Google gives you).  
  - Submit your sitemap: `https://resumemaster-ten.vercel.app/sitemap.xml`.

- **Bing**  
  - Go to [Bing Webmaster Tools](https://www.bing.com/webmasters).  
  - Add your site and verify (e.g. meta tag or file).  
  - Submit the same sitemap URL.

Submitting the sitemap helps Google and Bing discover and re-crawl your pages. It does **not** guarantee top rankings; it only helps with indexing.

### 3. **Optional: Google verification in code**

If you verify with an HTML meta tag, set in Vercel:

```env
GOOGLE_VERIFICATION_CODE=your_code_here
```

The app already uses this in metadata when set.

---

## Why You’re Not “Top Search Result” Yet (and what actually helps)

Search engines decide order by **relevance, quality, and authority**, not only by tags. So:

- **Good meta and structured data** – Help indexing and how your snippet looks; they don’t by themselves put you #1.
- **Content and backlinks** – Matter a lot. More useful, unique content (e.g. a blog, FAQs, clear product pages) and links from other sites (directories, Product Hunt, Reddit, blogs) help rankings over time.
- **Time** – New sites usually need weeks or months to gain traction in competitive terms like “resume comparison tool.”

So: **we’ve made sure your site is technically correct and easy to index.** To move toward “top search result” you need:

1. Correct `NEXT_PUBLIC_APP_URL` and sitemap submitted (above).  
2. Backlinks (e.g. Product Hunt, directories, guest posts, social posts that link to you).  
3. Optional: more on-site content (e.g. “How to compare resumes”, “Resume comparison tips”) and internal links.

---

## Social Media (Instagram, TikTok, LinkedIn, Facebook): How visibility works there

These platforms **do not** crawl the open web like Google. So:

- **Your site will not “show up” in Instagram or TikTok search** just because the tags are correct.  
- **To get traffic from these places**, you have to:
  - **Post there** (reels, posts, stories, etc.) and **include your link** (e.g. in bio, in post, in comments).  
  - Rely on people clicking that link to reach your site.

What we did on your site:

- When someone **does** share your link (e.g. on LinkedIn or Facebook), the **preview will show the right title, description, and image** (OG and Twitter tags).  
- So: **social meta tags = better preview when your link is shared.** They don’t make your site discoverable inside each app’s feed or search; **posting and linking** do.

---

## Checklist

| Task | Done on site? | You need to |
|------|----------------|------------|
| Meta title & description | ✅ | — |
| Canonical URLs | ✅ | Set `NEXT_PUBLIC_APP_URL` |
| Open Graph (Facebook, LinkedIn, etc.) | ✅ | — |
| Twitter card | ✅ | — |
| Structured data (Organization, WebSite, SoftwareApplication, FAQ) | ✅ | — |
| Sitemap | ✅ | Submit in Google & Bing |
| robots.txt | ✅ | — |
| Google Search Console | — | Add property, verify, submit sitemap |
| Bing Webmaster | — | Add site, verify, submit sitemap |
| Traffic from Instagram/TikTok/LinkedIn/Facebook | — | Post there and link to your site |

---

## Summary

- **Your site already has the right SEO and social tags** so that:  
  - Search engines can index you properly and show good snippets.  
  - Shared links on social and messaging show a proper preview.
- **You need to:**  
  - Set `NEXT_PUBLIC_APP_URL` to your real URL.  
  - Submit your sitemap in Google Search Console and Bing Webmaster Tools.  
- **“Top search result”** comes from relevance, content, backlinks, and time—not from tags alone; tags are the foundation.  
- **Visibility on Instagram, TikTok, LinkedIn, Facebook** comes from **posting and linking to your site** there; the tags only make those links look good when shared.
