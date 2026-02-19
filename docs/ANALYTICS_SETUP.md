# Analytics Setup Guide

Your Resume Comparison Engine includes **two analytics systems**:

1. **Vercel Analytics** (automatic, no setup) — page views, web vitals, performance metrics
2. **Google Analytics 4** (optional, requires setup) — detailed user behavior, custom events, conversions

## Vercel Analytics (Already Active)

✅ **No configuration needed** — Vercel Analytics is automatically enabled when deployed on Vercel.

**What you get:**
- Page views and unique visitors
- Web vitals (LCP, FID, CLS)
- Top pages, referrers, countries
- Real-time visitor count

**How to view:**
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project → **Analytics** tab
3. View metrics immediately (no setup required)

---

## Google Analytics 4 (Optional, Recommended)

Google Analytics provides deeper insights: user journeys, custom events (uploads, comparisons, exports), conversion tracking, and audience demographics.

### Step 1: Create a Google Analytics Property

1. Go to [Google Analytics](https://analytics.google.com/)
2. Click **Admin** (gear icon) → **Create Property**
3. Fill in:
   - Property name: `Resume Comparison Engine`
   - Reporting time zone: Your timezone
   - Currency: Your currency
4. Click **Next** → Select **Web** → Enter your domain (e.g., `resumemaster-ten.vercel.app`)
5. Click **Create**

### Step 2: Set Up Data Stream

1. In your new property, go to **Admin** → **Data Streams**
2. Click **Add stream** → **Web**
3. Fill in the form:
   - **Website URL:** Change `http://` to `https://` and enter: `https://www.resumemaster-ten.vercel.app` (or your actual domain)
   - **Stream name:** Enter a descriptive name like `Resume Comparison Engine` or `ResumeMaster`
   - **Enhanced measurement:** Leave enabled (toggle ON) — this automatically tracks page views, scrolls, clicks, etc.
4. Click **Create stream**

### Step 3: Get Your Measurement ID

1. After creating the stream, you'll see your **Measurement ID** (format: `G-XXXXXXXXXX`)
2. Copy this ID — you'll need it for the next step

### Step 4: Add to Vercel Environment Variables

1. Go to [Vercel Dashboard](https://vercel.com/dashboard) → Your project → **Settings** → **Environment Variables**
2. Add:
   - **Name:** `NEXT_PUBLIC_GA_ID`
   - **Value:** Your Measurement ID (e.g., `G-XXXXXXXXXX`)
   - **Environment:** Production (and optionally Preview)
3. Click **Save**
4. **Redeploy** your project (or wait for next deployment)

### Step 4: Verify It's Working

1. Visit your site: `https://resumemaster-ten.vercel.app`
2. Open browser DevTools → **Network** tab
3. Filter for `google-analytics.com` or `googletagmanager.com`
4. You should see requests being made
5. In Google Analytics → **Reports** → **Realtime**, you should see your visit within 30 seconds

---

## Custom Events Tracked

The app automatically tracks these events (visible in Google Analytics → **Events**):

| Event Name | When It Fires | Parameters |
|------------|----------------|------------|
| `file_upload` | User uploads resumes | `count`, `has_job_description` |
| `comparison_generated` | Comparison completes | `document_count`, `has_job_description`, `session_id` |
| `export_downloaded` | User downloads Excel export | `format` (xlsx), `session_id` |
| `feedback_submitted` | User submits feedback form | `role`, `would_recommend` |

**Note:** Custom events only appear if Google Analytics is configured (`NEXT_PUBLIC_GA_ID` is set).

---

## Viewing Analytics Data

### Vercel Analytics
- **Dashboard:** Vercel → Project → **Analytics** tab
- **Metrics:** Page views, visitors, top pages, referrers, countries
- **Real-time:** Current active visitors

### Google Analytics
- **Realtime:** Current active users, top pages, events
- **Reports → Engagement → Events:** Custom events (uploads, comparisons, exports)
- **Reports → Acquisition:** Traffic sources (organic, direct, social, etc.)
- **Reports → Engagement → Pages and screens:** Most visited pages
- **Reports → User → Demographics:** User location, device, browser

---

## Troubleshooting

**Vercel Analytics not showing data:**
- Ensure your project is deployed on Vercel (not just GitHub)
- Wait 5–10 minutes after deployment for initial data
- Check that you're viewing the correct project in Vercel dashboard

**Google Analytics not tracking:**
- Verify `NEXT_PUBLIC_GA_ID` is set in Vercel environment variables
- Ensure you redeployed after adding the env var
- Check browser console for errors (DevTools → Console)
- Verify Measurement ID format: `G-XXXXXXXXXX` (not `UA-` or `GA-`)
- Use Google Tag Assistant browser extension to debug

**Custom events not appearing:**
- Events only fire if Google Analytics is configured
- Check browser console for `gtag` errors
- Wait 24–48 hours for events to appear in standard reports (Realtime shows them immediately)

---

## Privacy & Compliance

- **Vercel Analytics:** Privacy-friendly, GDPR compliant, no cookies
- **Google Analytics:** Requires cookie consent banner in EU/UK (consider adding a consent banner if targeting EU users)

For EU compliance, you may want to add a cookie consent banner. See: [Next.js Cookie Consent Example](https://github.com/vercel/next.js/tree/canary/examples/with-google-analytics)
