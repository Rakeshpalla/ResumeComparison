# API Contracts

Base URL: `/api`

## Auth
### `POST /auth/register`
Body:
```json
{ "email": "user@company.com", "password": "min-8-chars" }
```
Response:
```json
{ "userId": "uuid" }
```

### `POST /auth/login`
Body:
```json
{ "email": "user@company.com", "password": "min-8-chars" }
```
Response:
```json
{ "userId": "uuid" }
```

### `POST /auth/logout`
Response:
```json
{ "success": true }
```

## Sessions
### `POST /sessions`
Headers:
- `Idempotency-Key` (optional)

Response:
```json
{ "sessionId": "uuid", "status": "PENDING" }
```

### `POST /sessions/:sessionId/documents/sign-upload`
Body:
```json
{ "filename": "spec.pdf", "contentType": "application/pdf", "sizeBytes": 12345 }
```
Response:
```json
{ "uploadUrl": "https://...", "s3Key": "sessions/..." }
```

### `POST /sessions/:sessionId/documents/complete`
Body:
```json
{ "s3Key": "sessions/...", "filename": "spec.pdf", "mimeType": "application/pdf", "sizeBytes": 12345 }
```
Response:
```json
{ "documentId": "uuid" }
```

### `POST /sessions/:sessionId/process`
Response:
```json
{ "status": "PROCESSING" }
```

### `GET /sessions/:sessionId/compare`
Response:
```json
{
  "status": "COMPLETED",
  "documents": [{ "id": "uuid", "filename": "spec.pdf" }],
  "rows": [
    {
      "key": "storage_capacity",
      "displayName": "Storage",
      "values": { "documentId": "1 TB" }
    }
  ]
}
```

### `GET /sessions/:sessionId/export`
Response: CSV file download.
