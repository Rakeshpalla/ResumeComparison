const MAX_PROXY_UPLOAD_BYTES = 50 * 1024 * 1024; // 50MB

/** Use Vercel Blob when BLOB_READ_WRITE_TOKEN is set; otherwise S3/R2. */
function useVercelBlob(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

// --- Vercel Blob implementation ---
async function blobPut(key: string, body: Buffer, contentType: string): Promise<void> {
  const { put } = await import("@vercel/blob");
  await put(key, body, {
    access: "public",
    contentType,
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

async function blobFetchBuffer(key: string): Promise<Buffer> {
  const { list } = await import("@vercel/blob");
  const { blobs } = await list({ prefix: key, limit: 1 });
  const blob = blobs.find((b) => b.pathname === key);
  if (!blob?.url) {
    throw new Error("Blob not found: " + key);
  }
  const res = await fetch(blob.url);
  if (!res.ok) {
    throw new Error("Failed to fetch blob: " + res.status);
  }
  const bytes = await res.arrayBuffer();
  return Buffer.from(bytes);
}

// --- S3 implementation ---
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const DEFAULT_SIGNED_DOWNLOAD_EXPIRY = 3600;
const REGION = process.env.AWS_REGION || "us-east-1";
const ENDPOINT = process.env.S3_ENDPOINT;

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
  credentials:
    process.env.AWS_ACCESS_KEY_ID ?
      {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
      }
    : undefined,
});

function isRetryableNetworkError(err: unknown): boolean {
  const code =
    err && typeof err === "object" && "code" in err ?
      (err as { code: string }).code
    : "";
  const message = err instanceof Error ? err.message : String(err);
  return (
    code === "ECONNRESET" ||
    code === "ETIMEDOUT" ||
    code === "ECONNREFUSED" ||
    message.includes("ECONNRESET") ||
    message.includes("socket hang up")
  );
}

// --- Public API (Blob or S3) ---

export async function createSignedUploadUrl(
  key: string,
  contentType: string
): Promise<string> {
  if (useVercelBlob()) {
    throw new Error(
      "Direct presigned upload is not supported with Vercel Blob. Use POST /api/sessions/.../documents/upload to upload files."
    );
  }
  const command = new PutObjectCommand({
    Bucket: getBucket(),
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(s3Client, command, { expiresIn: 300 });
}

export async function createSignedDownloadUrl(
  key: string,
  _expiresInSeconds: number = DEFAULT_SIGNED_DOWNLOAD_EXPIRY
): Promise<string> {
  if (useVercelBlob()) {
    const { list } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: key, limit: 1 });
    const blob = blobs.find((b) => b.pathname === key);
    if (!blob?.url) throw new Error("Blob not found: " + key);
    return blob.url;
  }
  const command = new GetObjectCommand({
    Bucket: getBucket(),
    Key: key,
  });
  return getSignedUrl(s3Client, command, {
    expiresIn: _expiresInSeconds,
  });
}

export async function fetchObjectBuffer(key: string): Promise<Buffer> {
  if (useVercelBlob()) {
    return blobFetchBuffer(key);
  }
  const command = new GetObjectCommand({
    Bucket: getBucket(),
    Key: key,
  });
  const response = await s3Client.send(command);
  if (!response.Body) {
    throw new Error("S3 object missing.");
  }
  const bytes = await response.Body.transformToByteArray();
  return Buffer.from(bytes);
}

export async function putObjectBuffer(
  key: string,
  body: Buffer,
  contentType: string
): Promise<void> {
  if (useVercelBlob()) {
    await blobPut(key, body, contentType);
    return;
  }
  const command = new PutObjectCommand({
    Bucket: getBucket(),
    Key: key,
    Body: body,
    ContentType: contentType,
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

export function getMaxProxyUploadBytes(): number {
  return MAX_PROXY_UPLOAD_BYTES;
}
