import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/** Default expiry for signed download URLs (1 hour). */
const DEFAULT_SIGNED_DOWNLOAD_EXPIRY = 3600;

const MAX_PROXY_UPLOAD_BYTES = 50 * 1024 * 1024; // 50MB

const REGION = process.env.AWS_REGION || "us-east-1";
const ENDPOINT = process.env.S3_ENDPOINT;

/** Lazy init to avoid throwing at build time when env vars are not set. */
function getBucket(): string {
  const bucket = process.env.S3_BUCKET;
  if (!bucket) {
    throw new Error("S3_BUCKET is not configured.");
  }
  return bucket;
}

const s3Client = new S3Client({
  region: REGION,
  endpoint: ENDPOINT || undefined,
  forcePathStyle: Boolean(ENDPOINT),
  credentials: process.env.AWS_ACCESS_KEY_ID
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ""
      }
    : undefined
});

export async function createSignedUploadUrl(
  key: string,
  contentType: string
) {
  const command = new PutObjectCommand({
    Bucket: getBucket(),
    Key: key,
    ContentType: contentType
  });
  return getSignedUrl(s3Client, command, { expiresIn: 300 });
}

/**
 * Generate a signed GET URL for private file access (e.g. temporary download link).
 * Use instead of exposing direct S3 URLs to clients.
 */
export async function createSignedDownloadUrl(
  key: string,
  expiresInSeconds: number = DEFAULT_SIGNED_DOWNLOAD_EXPIRY
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: getBucket(),
    Key: key
  });
  return getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
}

export async function fetchObjectBuffer(key: string) {
  const command = new GetObjectCommand({
    Bucket: getBucket(),
    Key: key
  });
  const response = await s3Client.send(command);
  if (!response.Body) {
    throw new Error("S3 object missing.");
  }
  const bytes = await response.Body.transformToByteArray();
  return Buffer.from(bytes);
}

function isRetryableNetworkError(err: unknown): boolean {
  const code = err && typeof err === "object" && "code" in err ? (err as { code: string }).code : "";
  const message = err instanceof Error ? err.message : String(err);
  return (
    code === "ECONNRESET" ||
    code === "ETIMEDOUT" ||
    code === "ECONNREFUSED" ||
    message.includes("ECONNRESET") ||
    message.includes("socket hang up")
  );
}

/** Upload a buffer to S3/MinIO (used by server-side proxy upload to avoid CORS). Retries once on connection errors. */
export async function putObjectBuffer(
  key: string,
  body: Buffer,
  contentType: string
) {
  const command = new PutObjectCommand({
    Bucket: getBucket(),
    Key: key,
    Body: body,
    ContentType: contentType
  });
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await s3Client.send(command);
      return;
    } catch (err) {
      lastErr = err;
      if (attempt === 0 && isRetryableNetworkError(err)) {
        await new Promise((r) => setTimeout(r, 500));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

export function getMaxProxyUploadBytes() {
  return MAX_PROXY_UPLOAD_BYTES;
}
