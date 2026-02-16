# Fix “Database not available” on Vercel – Step by Step

This guide is for non-technical users. Follow the steps in order.

---

## Part A: Fix Your Vercel Environment Variables

The app needs the **exact** database URL in Vercel. A single extra character will break it.

### The problem

If you copied the connection string from Neon’s “psql” instructions, it might look like:

```text
psql 'postgresql://neondb_owner:xxxxx@ep-xxx.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
```

In **Vercel**, the value must be **only the URL**. No `psql `, no space, and no single quotes `'...'`.

### Correct format in Vercel

1. Go to **Vercel** → your project (**resumemaster**) → **Settings** → **Environment Variables**.
2. Click **Edit** (or the `<>` icon) next to **DATABASE_URL**.
3. In **Value**, paste **only** this (use your real password from Neon):

   ```text
   postgresql://neondb_owner:YOUR_PASSWORD@ep-fancy-truth-aia0wvkd-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require
   ```

   - Replace `YOUR_PASSWORD` with the actual password from Neon (the part after `npg_` in your current string).
   - Do **not** include:
     - `psql `
     - Leading or trailing single quotes `'`
   - You can use **either**:
     - `?sslmode=require` only, or  
     - `?sslmode=require&channel_binding=require`  
   If the app still fails, try removing `&channel_binding=require` and use only `?sslmode=require`.

4. Do the same for **DIRECT_DATABASE_URL**: same value as **DATABASE_URL** (only the URL, no `psql ` or quotes).
5. Click **Save**.
6. **Redeploy**: **Deployments** → **⋮** on the latest deployment → **Redeploy**.

After redeploy, the “Database not available” error might still appear until you complete **Part B** (migrations).

---

## Part B: Run Migrations on the Production Database (One-Time)

Migrations create the tables (users, sessions, etc.) in your Neon database. You only need to do this **once** per production database.

### What you need

- This project open in **Cursor** (or VS Code).
- Your **production** database URL (the same one you put in Vercel – only the URL, e.g. `postgresql://neondb_owner:xxxxx@ep-...neon.tech/neondb?sslmode=require`).

### Step 1: Create a file with your database URL

1. In Cursor, in the **project root** (same folder as `package.json`), create a new file.
2. Name it **exactly**: `.env.production`
3. Put these two lines in it (replace the URL with your real Neon URL – the same one you use in Vercel, **no** `psql ` or quotes):

   ```env
   DATABASE_URL="postgresql://neondb_owner:YOUR_PASSWORD@ep-fancy-truth-aia0wvkd-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require"
   DIRECT_DATABASE_URL="postgresql://neondb_owner:YOUR_PASSWORD@ep-fancy-truth-aia0wvkd-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require"
   ```

4. Replace `YOUR_PASSWORD` with your real Neon database password.
5. Save the file (Ctrl+S).

**Important:** Do **not** commit this file to Git. It is already in `.gitignore` and must stay private.

### Step 2: Open the terminal in Cursor

1. In Cursor, open the **Terminal**:
   - Menu: **Terminal** → **New Terminal**, or  
   - Shortcut: **Ctrl+`** (backtick).
2. Make sure the terminal is in the **project root** (you should see `package.json` in the file list next to it).  
   If not, type:
   ```bash
   cd "c:\RAKESH\AI\SIDE HUSTLE\PDF_Spec_Comparision"
   ```
   and press Enter.

### Step 3: Run the migration command

1. In the same terminal, run:

   ```bash
   npm run migrate:prod
   ```

2. Press Enter.
3. Wait for it to finish. You should see lines like:
   - `Running Prisma migrations against production database...`
   - `Applying migration ...`
   - `Done.`
4. If you see **errors** (e.g. “Can’t reach database” or “authentication failed”):
   - Check that the URL in `.env.production` is **exactly** the same as in Vercel (only the URL, no `psql ` or quotes).
   - Check that the password is correct (copy from Neon dashboard if needed).

### Step 4: Redeploy on Vercel (if you haven’t already)

1. In Vercel: **Deployments** → **⋮** on the latest deployment → **Redeploy**.
2. Open your app’s login page again. The “Database not available” message should be gone and you should be able to register and sign in.

---

## Quick checklist

- [ ] **Part A:** In Vercel, `DATABASE_URL` and `DIRECT_DATABASE_URL` contain **only** the URL (no `psql `, no quotes).
- [ ] **Part A:** Redeployed after changing env vars.
- [ ] **Part B:** Created `.env.production` in the project root with the same two URLs.
- [ ] **Part B:** Ran `npm run migrate:prod` in the project terminal and saw “Done.”
- [ ] **Part B:** Redeployed on Vercel and tested the login page.

---

## If it still doesn’t work

1. **Vercel logs**  
   Vercel → your project → **Deployments** → latest → **Functions** or **Logs**. Open the log for a request to your site (e.g. when you load the login page). The error message there will tell you if it’s connection, SSL, or something else.

2. **Neon dashboard**  
   In Neon, check that the project is active and the connection string (and password) are correct. You can test the same URL from the “SQL Editor” or “Connection” tab.

3. **JWT_SECRET**  
   In Vercel, add **JWT_SECRET** (a long random string, e.g. from [randomkeygen](https://randomkeygen.com/) or run `openssl rand -base64 32` in a terminal) if you haven’t already. Without it, login/register may fail even when the database is working.
