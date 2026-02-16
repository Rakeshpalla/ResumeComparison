# Step-by-Step: Bring Resume Comparison Engine to Production

This guide walks you through **database → storage → Vercel → env vars → migrations → go live**. Use it in order.

---

## Prerequisites

- GitHub repo pushed (you already have this: [ResumeComparison](https://github.com/Rakeshpalla/ResumeComparison))
- Accounts (free): **Neon** (DB), **Vercel** (hosting), and either **AWS** or **Cloudflare** (file storage)

---

## Step 1: Create the production database (Neon)

1. Go to **[neon.tech](https://neon.tech)** and sign up (e.g. with GitHub).
2. Click **New Project**.
   - **Name:** e.g. `resume-compare-prod`
   - **Region:** Pick one close to your users (e.g. US East, EU).
3. After the project is created, open **Dashboard** → **Connection details**.
4. Copy **Connection string** (format: `postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require`).
5. **Optional but recommended for production:** Append pooler options:
   - Add `?sslmode=require&connection_limit=10&connect_timeout=10` (or append to existing query string).
6. Save this string somewhere safe — you’ll use it as `DATABASE_URL` and `DIRECT_DATABASE_URL` in Step 4.

**Note:** For Neon, the same connection string is usually used for both pooled (`DATABASE_URL`) and direct/migration (`DIRECT_DATABASE_URL`) connections. If Neon gives you a “direct” and a “pooled” URL, use pooled for `DATABASE_URL` and direct for `DIRECT_DATABASE_URL`.

---

## Step 2: Set up file storage (S3 or Cloudflare R2)

You need a bucket for uploaded resumes and exports. Choose one option.

### Option A: AWS S3

1. Log in to **[AWS Console](https://console.aws.amazon.com)**.
2. Open **S3** → **Create bucket**.
   - Name: e.g. `resume-compare-uploads` (globally unique).
   - Region: same as your app region if possible (e.g. `us-east-1`).
   - Block public access: keep default (block all).
3. Create an IAM user for the app:
   - **IAM** → **Users** → **Create user** (e.g. `resume-compare-app`).
   - **Attach policies** → Create inline policy (JSON), e.g.:
     ```json
     {
       "Version": "2012-10-17",
       "Statement": [{
         "Effect": "Allow",
         "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject", "s3:ListBucket"],
         "Resource": ["arn:aws:s3:::resume-compare-uploads", "arn:aws:s3:::resume-compare-uploads/*"]
       }]
     }
     ```
   - Create **Access key** for this user and copy **Access Key ID** and **Secret Access Key**.
4. You’ll set in Vercel: `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET`. **Do not set** `S3_ENDPOINT`.

### Option B: Cloudflare R2 (S3-compatible, free egress)

1. Log in to **[Cloudflare Dashboard](https://dash.cloudflare.com)**.
2. **R2** → **Create bucket** (e.g. `resume-compare-uploads`).
3. **R2** → **Manage R2 API Tokens** → **Create API token** with Object Read & Write.
4. Note:
   - **Endpoint:** e.g. `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`
   - **Access Key ID** and **Secret Access Key** from the token.
5. You’ll set in Vercel: `AWS_REGION=auto`, `S3_ENDPOINT=<endpoint above>`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET`.

---

## Step 3: Deploy the app on Vercel

1. Go to **[vercel.com](https://vercel.com)** and sign in with GitHub.
2. Click **Add New** → **Project**.
3. **Import** your repo: `Rakeshpalla/ResumeComparison` (or your fork).
4. **Configure project:**
   - **Framework Preset:** Next.js (auto-detected).
   - **Root Directory:** leave blank (`.`).
   - **Build Command:** leave default (uses `npm run build` from `package.json`, which runs the Vercel build script).
5. **Do not click Deploy yet.** Click **Environment Variables** (or go to **Settings** → **Environment Variables** after creating the project) and add all variables from Step 4 first; then deploy (or redeploy).

---

## Step 4: Add environment variables in Vercel

In **Vercel** → your project → **Settings** → **Environment Variables**, add these. Select **Production** (and **Preview** if you want preview deployments to work).

**Important – DATABASE_URL format:** Paste **only the URL** into Vercel. Do **not** include `psql ` or single quotes `'...'` around the URL. Correct: `postgresql://user:password@ep-xxx.aws.neon.tech/neondb?sslmode=require`  
If you still see "Database not available", see **[docs/VERCEL-DATABASE-SETUP.md](docs/VERCEL-DATABASE-SETUP.md)** for step-by-step fixes and how to run migrations.

### Required

| Variable | Value | Notes |
|----------|--------|--------|
| `DATABASE_URL` | Your Neon connection string from Step 1 | Must include `?sslmode=require` |
| `DIRECT_DATABASE_URL` | Same as `DATABASE_URL` (or Neon “direct” URL if you have one) | Used for migrations |
| `JWT_SECRET` | Long random string | e.g. run `openssl rand -base64 32` and paste |
| `AWS_REGION` | e.g. `us-east-1` (S3) or `auto` (R2) | |
| `AWS_ACCESS_KEY_ID` | From Step 2 (S3 or R2) | |
| `AWS_SECRET_ACCESS_KEY` | From Step 2 (S3 or R2) | |
| `S3_BUCKET` | Your bucket name from Step 2 | |

### Optional but recommended

| Variable | Value | Notes |
|----------|--------|--------|
| `NEXT_PUBLIC_APP_URL` | Your live URL | e.g. `https://your-app.vercel.app` or custom domain. Used for SEO, OG images, sitemap. |
| `DOCUMENT_TTL_HOURS` | `24` | How long to keep uploaded files (hours). |
| `MAX_FILE_SIZE_MB` | `10` | Max single file size (MB). |
| `MAX_UPLOAD_SIZE_MB` | `50` | Max total upload per request (MB). |
| `ALLOWED_ORIGINS` | (empty or comma-separated origins) | Leave empty for same-origin only; set if you need CORS. |

### Only for Cloudflare R2

| Variable | Value |
|----------|--------|
| `S3_ENDPOINT` | Your R2 endpoint, e.g. `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` |

### Optional (SEO / analytics)

| Variable | Value |
|----------|--------|
| `NEXT_PUBLIC_GA_ID` | Google Analytics 4 ID (e.g. `G-XXXXXXXXXX`) |
| `GOOGLE_VERIFICATION_CODE` | From Google Search Console (meta tag content) |
| `NEXT_PUBLIC_TWITTER_HANDLE` | e.g. `@yourhandle` |
| `NEXT_PUBLIC_TWITTER_URL` | Full Twitter/X profile URL |
| `NEXT_PUBLIC_LINKEDIN_URL` | Full LinkedIn company/page URL |
| `NEXT_PUBLIC_FACEBOOK_URL` | Full Facebook page URL |

After saving, trigger a **Redeploy** (Deployments → ⋮ on latest → Redeploy) so the new variables are applied.

---

## Step 5: Run database migrations (one-time)

Migrations create the tables in your production database. Run this **after** the first successful deploy and **only once** per production DB.

1. On your **local machine**, in the project root, create a file (e.g. `.env.production`) with **only** the production DB URL:
   ```env
   DATABASE_URL="postgresql://...your-neon-connection-string...?sslmode=require"
   DIRECT_DATABASE_URL="postgresql://...same-or-neon-direct-url..."
   ```
2. From the project root, run (see note below for .env.production):
   ```bash
   npm run migrate:prod
   ```
   If you don’t have `dotenv-cli`, set the env var in your shell and run:
   ```bash
   npx prisma migrate deploy
   ```
   (On Windows PowerShell you can set `$env:DATABASE_URL="..."; $env:DIRECT_DATABASE_URL="..."; npx prisma migrate deploy`.)
3. You should see output like “Applying migration …” for each migration. When it finishes, the app can create users and store data.

**If you don’t have migrations yet:** Ensure your `prisma/migrations` folder has migration SQL. If you’ve only used `prisma db push` locally, run once locally:

```bash
npx prisma migrate dev --name init
```

Then commit the new migration and push. After that, run `prisma migrate deploy` with production `DATABASE_URL` / `DIRECT_DATABASE_URL` as above.

---

## Step 6: Verify the app is live

1. Open your Vercel URL (e.g. `https://your-project.vercel.app`).
2. You should be redirected to `/login`.
3. **Register** a new account (use a real email you can access).
4. **Log in**, then:
   - Upload 2–5 resumes (PDF or DOCX).
   - Add an optional job description.
   - Run comparison and check the results page.
   - Export to Excel and confirm the file downloads.
5. If anything fails, check **Vercel** → **Deployments** → **Functions** / **Logs** and fix env vars or storage/DB as needed.

---

## Step 7 (Optional): Custom domain

1. **Vercel** → your project → **Settings** → **Domains** → **Add** your domain (e.g. `resumecompare.com`).
2. Follow the DNS instructions (usually add a CNAME record from your registrar pointing to `cname.vercel-dns.com`, or the A record Vercel shows).
3. After DNS propagates (minutes to hours), Vercel will issue SSL automatically.
4. Update `NEXT_PUBLIC_APP_URL` in Vercel to your custom domain (e.g. `https://resumecompare.com`) and redeploy if needed.

---

## Step 8 (Optional): Google Search Console and sitemap

1. Go to **[Google Search Console](https://search.google.com/search-console)** and add your property (your production URL).
2. Verify using the **HTML tag** method: copy the `content` value and set it in Vercel as `GOOGLE_VERIFICATION_CODE`, then redeploy.
3. In Search Console, open **Sitemaps** and submit: `https://<your-domain>/sitemap.xml`.

---

## Quick checklist

- [ ] **Step 1:** Neon project created; connection string copied.
- [ ] **Step 2:** S3 or R2 bucket and credentials ready.
- [ ] **Step 3:** Vercel project created and connected to GitHub.
- [ ] **Step 4:** All required env vars set in Vercel (`DATABASE_URL`, `DIRECT_DATABASE_URL`, `JWT_SECRET`, AWS/R2, `S3_BUCKET`); optional: `NEXT_PUBLIC_APP_URL`, SEO vars).
- [ ] **Step 5:** `npx prisma migrate deploy` run once with production DB URLs.
- [ ] **Step 6:** Register, login, upload, compare, export tested on production URL.
- [ ] (Optional) Custom domain added and `NEXT_PUBLIC_APP_URL` updated.
- [ ] (Optional) Search Console verified and sitemap submitted.
- [ ] (Optional) Terms and Privacy pages reviewed in `src/app/(public)/terms/page.tsx` and `src/app/(public)/privacy/page.tsx`.

---

## Troubleshooting

| Issue | What to check |
|-------|----------------|
| Build fails on Vercel | Run `npm run build` locally; fix TypeScript or missing env. Build script uses placeholder DB URL if env is missing, so build can succeed even before you set real `DATABASE_URL`. |
| "Database not available" on Vercel | 1) In Vercel, value must be only the URL (no `psql ` or quotes). 2) Run migrations once: see [docs/VERCEL-DATABASE-SETUP.md](docs/VERCEL-DATABASE-SETUP.md). 3) Redeploy after changing env vars. |
| "Can't reach database" / 503 | `DATABASE_URL` and `DIRECT_DATABASE_URL` must include `?sslmode=require` for Neon. Neon allows all IPs by default. |
| Upload / storage errors | S3: no `S3_ENDPOINT`. R2: set `S3_ENDPOINT` and use R2 credentials. Check bucket name and IAM/R2 token permissions. |
| Auth / login fails | Ensure `JWT_SECRET` is set in Vercel (Production and Preview if you use previews). |
| Redirect or OG links wrong | Set `NEXT_PUBLIC_APP_URL` to your exact production URL (with `https://`). |

---

## Summary flow

1. **Database:** Create Neon project → copy connection string(s).  
2. **Storage:** Create S3 or R2 bucket and access keys.  
3. **Vercel:** Import repo, add all env vars, then deploy.  
4. **Migrations:** Run `npx prisma migrate deploy` once with production `DATABASE_URL`/`DIRECT_DATABASE_URL`.  
5. **Verify:** Register, login, upload, compare, export on the live URL.  
6. **Optional:** Custom domain, Search Console, sitemap.

After this, your app is in production and others can start using it.
