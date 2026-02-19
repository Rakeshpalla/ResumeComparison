# Fix: "The table 'public.feedback_responses' does not exist"

This error on the **Vercel** feedback form means the production database (Neon) has not had the feedback migration applied yet. Run it **once** from your machine.

## One-time setup

### 1. Get your production database URL

- Open [Vercel Dashboard](https://vercel.com/dashboard) → your project → **Settings** → **Environment Variables**
- Copy the value of **`DATABASE_URL`** (the Neon Postgres connection string)

### 2. Use `.env.production` or `.env.production.json` (do not commit these)

In the **project root** (same folder as `package.json`), use one of:

- **`.env.production`** – plain env format:
  ```env
  DATABASE_URL="postgresql://user:password@host/neondb?sslmode=require"
  DIRECT_DATABASE_URL="postgresql://user:password@host/neondb?sslmode=require"
  ```
- **`.env.production.json`** – either JSON `{ "DATABASE_URL": "...", "DIRECT_DATABASE_URL": "..." }` or the same KEY=value lines as above.

Paste your actual `DATABASE_URL` value. If you omit `DIRECT_DATABASE_URL`, it falls back to `DATABASE_URL`.

### 3. Run the production migration

From the project root:

```bash
npm run migrate:prod
```

Or:

```bash
npx prisma migrate deploy
```

(The script loads `DATABASE_URL` and `DIRECT_DATABASE_URL` from `.env.production` or `.env.production.json` if present.)

### 4. Verify

Submit the feedback form again on `https://resumemaster-ten.vercel.app/feedback`. It should succeed.

---

## Viewing submitted feedback (admin dashboard)

Feedback is stored in the production Neon database. To view and export it:

1. **Set admin password (one-time)**  
   In Vercel → Project → **Settings** → **Environment Variables**, add:
   - **Name:** `ADMIN_PASSWORD`
   - **Value:** a strong password (only you need to know it)  
   Apply to Production (and optionally Preview), then redeploy if needed.

2. **Open the admin dashboard**  
   Go to: **https://resumemaster-ten.vercel.app/admin/feedback**

3. **Log in** with the same password you set for `ADMIN_PASSWORD`.

4. You can browse all feedback and use **Export** to download a CSV.

---

**Note:** `.env.production` / `.env.production.json` are for running migrations locally against production; they are not used by Vercel at runtime. Vercel already has `DATABASE_URL` in its environment; the migration just needs to be run once against that database.
