/**
 * Input sanitization for production security.
 * Use as an additional layer after Zod validation; does not replace validation.
 */

import xss from "xss";

/** Strip control characters and null bytes from plain text (for DB/storage). */
export function sanitizePlainText(input: string, maxLength = 50_000): string {
  if (typeof input !== "string") return "";
  const stripped = input
    .replace(/\0/g, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .trim();
  return stripped.length > maxLength ? stripped.slice(0, maxLength) : stripped;
}

/** Sanitize for safe HTML output (e.g. when rendering user content). */
export function sanitizeHtml(html: string): string {
  if (typeof html !== "string") return "";
  return xss(html, { stripIgnoreTagBody: ["script"] });
}

/** Sanitize filename: remove path segments and control chars. */
export function sanitizeFilename(name: string, maxLength = 200): string {
  if (typeof name !== "string") return "";
  const base = name.replace(/^.*[/\\]/, "").replace(/[\0\x00-\x1F\x7F]/g, "").trim();
  return base.length > maxLength ? base.slice(0, maxLength) : base;
}
