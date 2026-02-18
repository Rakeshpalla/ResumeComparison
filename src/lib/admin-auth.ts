import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";

const ADMIN_COOKIE_NAME = "admin_feedback_session";
const ADMIN_COOKIE_VALUE = "authenticated";

/**
 * Verifies that the request has a valid admin session (set after password check).
 * Uses a signed cookie so it can't be forged without knowing ADMIN_PASSWORD.
 */
export function getAdminCookieSignature(): string {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return "";
  return createHmac("sha256", password).update(ADMIN_COOKIE_VALUE).digest("hex");
}

/**
 * Returns true if the admin feedback cookie is present and signature matches.
 */
export async function isAdminAuthenticated(): Promise<boolean> {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return false;
  const cookieStore = await cookies();
  const cookie = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (!cookie) return false;
  const expected = getAdminCookieSignature();
  if (cookie.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(cookie, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

/**
 * Cookie name for admin session (so callers can set it).
 */
export { ADMIN_COOKIE_NAME, ADMIN_COOKIE_VALUE };
