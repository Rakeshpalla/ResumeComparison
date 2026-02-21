# Resume Comparison Engine — Tech Stack

Quick reference for posts, README, or job discussions.

---

## Frontend

| Technology | Use |
|------------|-----|
| **Next.js 14** | React framework, App Router, API routes, server components |
| **React 18** | UI components |
| **TypeScript** | Type safety across the app |
| **Tailwind CSS** | Styling, responsive layout |
| **React Hook Form** | Form state (upload, feedback, login) |
| **Zod** | Schema validation (forms + API) |

---

## Backend / API

| Technology | Use |
|------------|-----|
| **Next.js API Routes** | REST endpoints (sessions, auth, upload, compare, export) |
| **Prisma** | ORM, migrations, type-safe DB access |
| **PostgreSQL** | Primary database (Neon in production) |
| **JWT (jose)** | Session tokens in HttpOnly cookies |
| **bcryptjs** | Password hashing (when login is enabled) |

---

## File & Document Handling

| Technology | Use |
|------------|-----|
| **AWS SDK (S3)** | Signed upload URLs, resume storage (S3 or MinIO locally) |
| **pdf-parse** | Extract text from PDF resumes |
| **mammoth** | Extract text from DOCX resumes |
| **xlsx / xlsx-js-style** | Generate Excel reports (scorecards, side-by-side, improvements) |

---

## Hosting & Services (Production)

| Service | Use |
|---------|-----|
| **Vercel** | Hosting, serverless functions, deployments from GitHub |
| **Neon** | Serverless PostgreSQL |
| **AWS S3** (or **Cloudflare R2**) | Resume file storage |
| **Resend** | Transactional email (feedback follow-up, admin notifications) |

---

## Dev & Quality

| Technology | Use |
|------------|-----|
| **Playwright** | E2E tests |
| **ESLint** | Linting |
| **Docker** | Local PostgreSQL + MinIO (optional) |

---

## Analytics (optional)

| Technology | Use |
|------------|-----|
| **Vercel Analytics** | Page views, web vitals |
| **Google Analytics 4** | Events (uploads, comparisons, exports), traffic sources |

---

## One-liner for Reddit

**Short:**  
*Next.js 14, React, TypeScript, Tailwind, Prisma, PostgreSQL (Neon), S3, Vercel. PDF/DOCX parsing, Excel export, JWT auth (optional guest mode).*

**Medium:**  
*Built with Next.js 14 (App Router), React, TypeScript, Tailwind CSS, Prisma + PostgreSQL (Neon), and S3 for file storage. Resumes parsed with pdf-parse and mammoth; Excel reports with xlsx-js-style. Hosted on Vercel with optional Google Analytics.*

**Bullet list:**  
- **Frontend:** Next.js 14, React, TypeScript, Tailwind CSS  
- **Backend:** Next.js API routes, Prisma, PostgreSQL (Neon)  
- **Storage:** AWS S3 (signed uploads), Resend for email  
- **Docs:** PDF (pdf-parse), DOCX (mammoth), Excel export (xlsx-js-style)  
- **Hosting:** Vercel  
- **Auth:** JWT in HttpOnly cookies (guest-only mode available)
