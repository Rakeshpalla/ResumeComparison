# Production Hardening

## Phase 1: Security Foundation (Implemented)

### 1.1 Security Headers & CORS
- **next.config.mjs**: Security headers added (HSTS, X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy, Content-Security-Policy).
- **middleware.ts**: CORS for `/api/*` with `ALLOWED_ORIGINS` (comma-separated). In development, localhost origins are allowed when `ALLOWED_ORIGINS` is unset.
- **Env**: `NODE_ENV`, `ALLOWED_ORIGINS`.

### 1.2 Rate Limiting
- **src/lib/rate-limit.ts**: In-memory rate limiter (per IP). Buckets: `auth` (5/15min), `upload` (10/hour), `process` (20/hour), `api` (100/15min).
- Applied in: login, register, sessions POST, documents/upload, process.
- **Env**: `RATE_LIMIT_ENABLED` — set to `false` to disable (e.g. dev). Default: disabled in development, enabled in production.

### 1.3 Cookie Security
- **src/lib/auth.ts**: Session cookie uses `sameSite: "strict"`, `secure: true` in production, `httpOnly: true`, `path: "/"`, explicit `maxAge`.

### 1.4 Input Sanitization
- **src/lib/sanitize.ts**: `sanitizePlainText`, `sanitizeHtml` (xss), `sanitizeFilename`.
- **validation.ts**: Email and filename fields sanitized via Zod transform.
- **API routes**: `jdText` / `contextText` sanitized in hiring-ui, rank, export-xlsx (max 50k chars).

## New / Updated Environment Variables (.env.example)

- `NODE_ENV` — development | production
- `ALLOWED_ORIGINS` — comma-separated CORS origins (empty in dev = localhost allowed)
- `RATE_LIMIT_ENABLED` — set to `false` to disable rate limiting

## Testing After Phase 1

- All existing pages and API routes should work unchanged.
- In production, set `ALLOWED_ORIGINS` to your domain(s).
- Rate limiting: in production, exceeding limits returns `429` with `Retry-After` and a clear error message.

## Phase 2: File Upload Security (Implemented)

### 2.1 File Type Validation
- **src/lib/file-validation.ts**: Magic-number validation (PDF: `%PDF`, DOCX: ZIP `PK`). Configurable `MAX_FILE_SIZE_MB` (default 10) and `MAX_UPLOAD_SIZE_MB` (default 50). Single file must not exceed max file size; upload route uses max upload size.
- **Upload route**: After reading buffer, validates with `validateFileBuffer(buffer, mime, size)` and rejects with 400 if content does not match declared type.

### 2.2 S3 Signed URLs
- **src/services/storage.ts**: `createSignedDownloadUrl(key, expiresInSeconds)` for private file access (default 1 hour). Use instead of exposing direct S3 URLs to clients. Uploads already use presigned PUT URLs.

### 2.3 Upload Quota (per user per hour)
- **src/lib/rate-limit.ts**: `checkUploadBytesQuota(userId, additionalBytes)` and `recordUploadBytes(userId, bytes)`. Limit: 100MB per user per hour. Returns 429 with clear message when exceeded. Applied in documents/upload route.

---

## Phase 3: Database Security & Performance (Implemented)

### 3.1 Connection Pool & Config
- **prisma/schema.prisma**: `directUrl = env("DIRECT_DATABASE_URL")` for migrations (use direct connection when app uses pooled URL). Documented in .env.example: add `connection_limit` and `connect_timeout` to `DATABASE_URL` for production (e.g. `?connection_limit=10&connect_timeout=10`).

### 3.2 Database Indexing
- **User**: `@@index([email])`.
- **ComparisonSession**: `@@index([userId])`, `@@index([userId, status])`, `@@index([createdAt])`.
- **Document**: `@@index([sessionId])`, `@@index([userId])`.
- **ExtractedField**: `@@index([documentId])`.
- **NormalizedAttribute**: already had `@@index([sessionId, key])`.
- Migration: `20260215094252_add_indexes_and_direct_url`.

### 3.3 Query Timeout & Error Handling
- **src/lib/db.ts**: Prisma middleware wraps queries with `Promise.race` against `DATABASE_CONNECTION_TIMEOUT` (default 30s). One retry on transient errors (connection, timeout, deadlock, serialization).

---

## New / Updated Environment Variables

- **Phase 2**: `MAX_FILE_SIZE_MB` (default 10), `MAX_UPLOAD_SIZE_MB` (default 50).
- **Phase 3**: `DIRECT_DATABASE_URL` (required; can equal `DATABASE_URL` if not using a pooler). Optional: `DATABASE_CONNECTION_TIMEOUT` (ms, default 30000).

---

## Next Phases (Planned)

- **Phase 4**: Observability (logging, Sentry, health/ready/live — health endpoints already added).
- **Phase 5**: CSRF, env validation, dependency audit.
- **Phase 6**: Redis (optional), caching.
- **Phase 7**: Security and load tests.
