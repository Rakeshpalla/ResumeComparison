/**
 * File validation using magic numbers (buffer signatures) and configurable size limits.
 * Use in addition to extension/MIME checks to prevent polyglot uploads.
 */

const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46]); // %PDF
const ZIP_MAGIC = Buffer.from([0x50, 0x4b]); // PK (DOCX is ZIP-based)

const ALLOWED: { mime: string; magic: Buffer; minLen: number }[] = [
  { mime: "application/pdf", magic: PDF_MAGIC, minLen: 4 },
  {
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    magic: ZIP_MAGIC,
    minLen: 2
  }
];

function getMaxFileSizeBytes(): number {
  const mb = process.env.MAX_FILE_SIZE_MB;
  const n = mb ? Number(mb) : 10;
  return Number.isFinite(n) && n > 0 ? n * 1024 * 1024 : 10 * 1024 * 1024;
}

export function getMaxUploadSizeBytes(): number {
  const mb = process.env.MAX_UPLOAD_SIZE_MB;
  const n = mb ? Number(mb) : 50;
  return Number.isFinite(n) && n > 0 ? n * 1024 * 1024 : 50 * 1024 * 1024;
}

/**
 * Validates buffer against allowed magic numbers and size.
 * Returns { ok: true } or { ok: false, error: string }.
 */
export function validateFileBuffer(
  buffer: Buffer,
  declaredMime: string,
  declaredSize: number
): { ok: true } | { ok: false; error: string } {
  const maxFile = getMaxFileSizeBytes();
  if (declaredSize > maxFile) {
    return {
      ok: false,
      error: `File exceeds maximum size (${Math.round(maxFile / 1024 / 1024)}MB).`
    };
  }
  if (buffer.length < 4) {
    return { ok: false, error: "File too small to validate." };
  }
  const allowed = ALLOWED.find((a) => a.mime === declaredMime);
  if (!allowed) {
    return { ok: false, error: "Unsupported file type. Use PDF or DOCX." };
  }
  if (!buffer.subarray(0, allowed.minLen).equals(allowed.magic.subarray(0, allowed.minLen))) {
    return { ok: false, error: "File content does not match declared type (invalid or corrupted)." };
  }
  return { ok: true };
}

export { getMaxFileSizeBytes };
