# Decision Comparison Engine

**Consulting-grade comparison tool** for high-stakes business decisions. Compare 2-5 documents (PDF/DOCX) across multiple decision lenses (Hiring, RFP, Sales) and export structured Excel reports with executive scorecards, side-by-side evaluations, improvement plans, and risk analysis.

## Features

- 🎯 **Multi-Lens Analysis**: Hiring, RFP/Proposal, and Sales decision frameworks
- 📊 **Excel Export**: 4-sheet consulting-grade reports (Executive Scorecard, Side-by-Side, Improvements, Risks)
- 📄 **Document Support**: PDF and DOCX uploads (up to 5 documents)
- 🔐 **Authentication**: Secure user accounts with JWT session management
- 🧪 **E2E Testing**: Playwright test suite for critical user flows
- 🎨 **Modern UI**: Clean, intuitive interface with drag-and-drop file uploads

## Quick Start

1. **Clone and install dependencies:**
   ```bash
   git clone <your-repo-url>
   cd PDF_Spec_Comparision
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration (defaults work for local dev)
   ```

3. **Start local services (Docker required):**
   ```bash
   docker compose up -d
   ```
   This starts PostgreSQL (port 5432) and MinIO (port 9000, console on 9001)

4. **Initialize database:**
   ```bash
   npx prisma generate
   npx prisma migrate dev
   ```

5. **Start the application:**
   ```bash
   npm run portal
   ```
   Access at `http://localhost:3000`

## Development Scripts

- `npm run dev` - Start development server (hot reload)
- `npm run portal` - Clean build + production server (recommended for testing)
- `npm run build` - Build for production
- `npm test:e2e` - Run Playwright E2E tests
- `npm test:e2e:ui` - Run tests in UI mode
- `npm run clean:next` - Clear Next.js cache

## Project Structure

```
src/
  app/
    (app)/              # Authenticated app routes (upload, compare)
    (public)/           # Public routes (login)
    api/                # Next.js API routes
  components/           # React components
  lib/                  # Utilities (auth, validation, db)
  services/             # Business logic (comparison, ranking, Excel export)
e2e/                    # Playwright E2E tests
prisma/                 # Database schema and migrations
docs/                   # Documentation (QA readiness, architecture)
scripts/                # Utility scripts (port cleanup, cache clearing)
```

## Key Architecture

- **Authentication**: JWT tokens in HttpOnly cookies, middleware-protected routes
- **File Storage**: Direct S3 uploads via signed URLs (MinIO for local dev)
- **State Management**: SessionStorage for user context, prevents cross-session leakage
- **Decision Engine**: Structured comparison with forced differentiation (1-5 scoring)
- **Excel Generation**: `xlsx-js-style` for formatted, multi-sheet workbooks

## Testing

### Automated E2E Tests
Run the full regression suite:
```bash
npm run portal:test  # Starts test server on port 3100
npm test:e2e         # Runs all Playwright tests
```

Tests cover:
- ✅ User registration and authentication
- ✅ Document upload and processing
- ✅ Comparison dashboard viewing
- ✅ Logout and state cleanup
- ✅ Multi-tab session invalidation
- ✅ Browser refresh persistence
- ✅ Invalid input handling

### Manual Testing Checklist
See `docs/QA_READINESS.md` for comprehensive exploratory testing checklist and MVP launch criteria.

## Environment Variables

Key variables (see `.env.example` for full list):
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for session tokens (generate securely for production)
- `S3_ENDPOINT` - S3-compatible storage endpoint (MinIO for local)
- `DOCUMENT_TTL_HOURS` - Auto-delete documents after N hours (default: 24)

## Documentation

- **QA Readiness**: `docs/QA_READINESS.md` - Testing strategy and launch criteria
- **Architecture**: `docs/architecture.md` - System design and patterns
- **API Contracts**: `docs/api.md` - Endpoint specifications

## Production Deployment

1. Set `JWT_SECRET` to a cryptographically secure random string
2. Configure production S3 bucket (AWS S3, DigitalOcean Spaces, etc.)
3. Set `S3_ENDPOINT`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
4. Use managed PostgreSQL database
5. Set `NODE_ENV=production`
6. Enable HTTPS for secure cookies

## License

Proprietary - All rights reserved
