import { z } from "zod";
import { sanitizePlainText, sanitizeFilename } from "./sanitize";

export const authSchema = z.object({
  email: z.string().email().transform((s) => sanitizePlainText(s, 256)),
  password: z.string().min(8).max(128)
});

export const createSessionSchema = z.object({});

export const signUploadSchema = z.object({
  filename: z.string().min(1).max(200).transform((s) => sanitizeFilename(s, 200)),
  contentType: z.union([
    z.literal("application/pdf"),
    z.literal(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    )
  ]),
  sizeBytes: z.number().int().min(1).max(25 * 1024 * 1024)
});

export const completeUploadSchema = z.object({
  s3Key: z.string().min(1),
  filename: z.string().min(1).max(200).transform((s) => sanitizeFilename(s, 200)),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().min(1).max(25 * 1024 * 1024)
});
