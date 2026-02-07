import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

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
