# SpecSheet Compare Architecture

## Overview
- **API layer**: Next.js route handlers in `src/app/api` expose REST endpoints.
- **Service layer**: Business logic lives in `src/services`.
- **Extraction engine**: Pluggable PDF extractors in `src/extraction`.
- **Persistence layer**: Prisma ORM in `src/lib/db` with PostgreSQL.

## Data Flow
1. User authenticates via `/api/auth/*`.
2. Client creates a comparison session.
3. Client requests signed S3 upload URLs and uploads PDFs directly to S3.
4. Client finalizes document metadata in the backend.
5. Client requests processing; extraction runs asynchronously.
6. Normalized attributes stored per session.
7. UI renders comparison table and supports CSV export.

## Security
- JWT stored in `HttpOnly` cookie.
- Passwords hashed with bcrypt.
- Input validation via Zod for every API payload.
- Signed S3 URLs for upload.
- PDFs are not stored in the database.
- Customer data is never used for training.

## Extensibility
- Swap out `PdfParseExtractor` with another `PdfExtractor`.
- Replace `enqueueSessionExtraction` with a queue worker.
- Extend `normalizationService` synonym dictionary for domain tuning.
