# Deploying Resume Comparison Engine (MVP)

This guide covers deploying to **Vercel** with **Neon** (Postgres) and **S3** (or Cloudflare R2) for file storage. All steps use free tiers where possible.

---

## What you need to do yourself

Only you can:

- Create accounts: **Vercel**, **Neon**, **Stripe** (and optionally a domain registrar).
- Add **environment variables** in Vercel (secrets stay on your side).
- Run **one CLI command** after DB is ready: `npx prisma migrate deploy`.

Everything below is written so you can follow it step by step.

---

## 1. Database: Neon (free Postgres)

1. Go to [neon.tech](https://neon.tech) and sign up (GitHub is fine).
2. Create a new project (e.g. name: `resume-compare`, region: closest to your users).
3. In the dashboard, open **Connection details** and copy the **connection string** (e.g. `postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require`).
4. You will paste this as `DATABASE_URL` in Vercel (step 3).

No need to run migrations yet; we do that after Vercel is connected.

---

## 2. Hosting: Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub.
2. Click **Add New** → **Project** and import your **Resume Comparison Engine** repo.
3. Leave **Framework Preset** as Next.js and **Root Directory** as `.`.
4. Before deploying, add environment variables (step 3 below), then click **Deploy**.

---

## 3. Environment variables (Vercel)

In your Vercel project: **Settings** → **Environment Variables**. Add these for **Production** (and optionally Preview):

| Variable | Description | Example / notes |
|----------|-------------|------------------|
| `DATABASE_URL` | Neon connection string from step 1 | `postgresql://...?sslmode=require` |
| `JWT_SECRET` | Long random string for signing JWTs | e.g. `openssl rand -base64 32` |
| `AWS_REGION` | AWS region for S3 (or R2) | e.g. `us-east-1` |
| `AWS_ACCESS_KEY_ID` | S3/R2 access key | From AWS IAM or Cloudflare R2 |
| `AWS_SECRET_ACCESS_KEY` | S3/R2 secret key | From AWS IAM or Cloudflare R2 |
| `S3_BUCKET` | Bucket name for uploads | e.g. `your-app-uploads` |
| `DOCUMENT_TTL_HOURS` | (Optional) Hours to keep docs | e.g. `24` |

**Important:**

- For **real AWS S3**: do **not** set `S3_ENDPOINT` (or leave it blank). The app uses the default S3 endpoint.
- For **Cloudflare R2**: set `S3_ENDPOINT` to your R2 endpoint (e.g. `https://<account_id>.r2.cloudflarestorage.com`) and use R2’s access key/secret and bucket name.

After saving, trigger a **Redeploy** so the new env vars are applied.

---

## 4. Run database migrations

After the first successful deploy, run migrations against the **production** database:

1. Locally, create a `.env.production` (or a one-off env) with **only** `DATABASE_URL` set to your Neon connection string.
2. From the project root run:
   ```bash
   npx prisma migrate deploy
   ```
   (Ensure this uses the production `DATABASE_URL`; e.g. `dotenv -e .env.production -- npx prisma migrate deploy` if you use dotenv-cli.)

Once this succeeds, your app can create users and store session data.

---

## 5. File storage (choose one)

- **AWS S3**: Create a bucket and an IAM user with `s3:PutObject`, `s3:GetObject`, and optionally `s3:DeleteObject`. Use that user’s keys in Vercel. Do not set `S3_ENDPOINT`.
- **Cloudflare R2**: Create a bucket and API tokens in the R2 dashboard. Set `S3_ENDPOINT`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `S3_BUCKET` in Vercel (R2 is S3-compatible).

---

## 6. Custom domain (optional)

1. Buy a domain (e.g. Porkbun, Namecheap; ~$8–10/year).
2. In Vercel: **Project** → **Settings** → **Domains** → add your domain and follow the DNS instructions (usually one CNAME or A record).
3. After DNS propagates, Vercel will provision SSL automatically.

---

## 7. Payments: Stripe (MVP)

For MVP you can avoid backend payment code:

1. Create a [Stripe](https://stripe.com) account.
2. In Stripe Dashboard: **Product** → create a product (e.g. “Resume Comparison – Pro”).
3. Create a **Payment Link** for that product and set the success/cancel URLs (e.g. your app’s `/upload` and `/login`).
4. Add a “Upgrade” or “Subscribe” button in your app that links to this Payment Link URL.

No env vars are required in the app for this flow; you only need the link.

---

## 8. Legal pages

The app already includes:

- **Terms of Service**: `/terms`
- **Privacy Policy**: `/privacy`

They are linked from the footer. Review and edit the content in `src/app/(public)/terms/page.tsx` and `src/app/(public)/privacy/page.tsx` to match your business and jurisdiction before going live.

---

## Quick checklist

- [ ] Neon project created; `DATABASE_URL` copied
- [ ] Vercel project created and connected to GitHub
- [ ] All env vars set in Vercel (including `JWT_SECRET`, S3/R2, `DATABASE_URL`)
- [ ] First deploy successful
- [ ] `npx prisma migrate deploy` run with production `DATABASE_URL`
- [ ] Test: register, login, upload, compare, export
- [ ] (Optional) Custom domain added in Vercel
- [ ] (Optional) Stripe Payment Link created and linked from the app
- [ ] Terms and Privacy pages reviewed and updated

---

## Troubleshooting

- **Build fails**: Check that `npm run build` works locally; fix any TypeScript or missing env issues.
- **DB connection errors**: Ensure `DATABASE_URL` includes `?sslmode=require` for Neon and that the IP is allowed (Neon allows all by default).
- **Upload errors**: Verify S3/R2 keys and bucket name; for R2, ensure `S3_ENDPOINT` is set and correct.
- **Auth errors**: Ensure `JWT_SECRET` is set and the same across all Vercel environments that serve the app.
