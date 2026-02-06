# MVP QA Readiness (Launch Gate)

This document defines the **golden paths**, the **automated E2E regression suite**, and the **manual exploratory checklist** for MVP launch readiness.

## Golden paths (non‑negotiable)

1. **Signup → login → logout**
   - New user can create an account
   - User can sign in
   - User can sign out and is returned to `/login`

2. **Login → enter context → logout → login again (no unintended persistence)**
   - User enters context text on `/upload`
   - After logout/login, the previous user's context must **not** leak to the new session

3. **Upload → process → view result**
   - Upload 2+ documents
   - Generate insights (processing)
   - Navigate to `/compare/<sessionId>` and view the dashboard

4. **Refresh during flow**
   - Refresh on `/compare/<sessionId>` must not crash or show stale data

5. **Open in new tab**
   - If user is logged in, opening `/upload` in a new tab works
   - After logout in one tab, protected routes must become inaccessible in other tabs after refresh

6. **Invalid input scenarios**
   - Selecting <2 files shows a clear, actionable error

## Automated E2E suite (Playwright)

Run:

```bash
npm run test:e2e
```

Design principles:
- Browser perspective only (black‑box)
- No mocking of critical APIs
- Tests are isolated (each test uses a fresh account)
- Server is started fresh for each run to avoid stale Next.js dev bundles on Windows

Coverage:
- Smoke: signup → upload → logout
- Regression: logout clears local client state (context textarea)
- Golden path: upload 2 PDFs → generate insights → compare dashboard → refresh
- Regression: multi-tab logout invalidates protected routes after refresh
- Invalid input: selecting 1 file shows an error

## Critical security + correctness requirements

- **Protected routes**: `/upload` and `/compare/*` must redirect to `/login` when unauthenticated.
- **Logout destroys user state**:
  - Server: session cookie cleared
  - Client: `localStorage` + `sessionStorage` cleared
  - No prior user context survives across logout/login boundaries
- **401 handling**:
  - When API returns `401`, client must navigate to `/login`

## Exploratory testing checklist (manual)

### Auth & session
- Open `/upload` unauthenticated → must redirect to `/login`
- Login, then open `/upload` in a new tab → must work
- Logout in tab A → refresh tab B on `/upload` → must redirect to `/login`
- Browser back/forward after logout → must not reveal protected pages

### Upload flow
- Drag/drop 2 files → selection renders correctly
- Click **Generate insights** immediately → auto-uploads then processes
- Network interruption mid-upload → visible error message
- Rapid double-click **Generate insights** → no duplicate sessions created (or safe behavior)
- Upload 5 docs → UI remains responsive

### Compare flow
- Refresh `/compare/<sessionId>` while status is processing → should recover and show results eventually
- Export Excel in both 2-doc and multi-doc selection modes
- Lens selector changes and export error handling is clear

### Data & privacy
- Ensure context input does not persist across logout/login (different user)
- Confirm no PII is logged to console/network errors

### Error handling
- Invalid file types rejected with clear messaging
- If server returns 422 (lens confidence) → user sees actionable message

## MVP launch gate (definition)

**MVP ready means:**
- `npm run test:e2e` passes
- No recurring “missing module ./###.js” runtime errors when using the stable start command
- Logout clears state and protected routes are enforced
- Upload → process → compare works end-to-end for PDFs and DOCX

**Launch blockers:**
- Auth bypass to protected routes
- State leakage across users/sessions
- Blank pages or non-actionable errors
- Export failing on happy path

**Can be deferred:**
- Long-tail UX polish
- Extended performance optimization (unless it causes timeouts)

## Post-launch hardening TODOs
- Add server-side token revocation list (JWT invalidation) if needed
- Add rate limiting on auth + upload endpoints
- Add structured logging (no PII) + request correlation IDs
- Add unit tests for core “decision engine” utilities

