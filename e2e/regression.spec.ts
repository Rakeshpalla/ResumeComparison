import { test, expect } from "@playwright/test";
import {
  attachConsoleErrorFail,
  logout,
  makePdfFixture,
  registerAndGoToUpload
} from "./utils";

test("regression: logout clears user-local state (context textarea)", async ({ page }) => {
  // Why: previously localStorage persisted across logout/login, leaking user context.
  const assertNoConsoleErrors = attachConsoleErrorFail(page);

  await registerAndGoToUpload(page);
  const context = page.getByPlaceholder(/paste jd/i);
  await context.fill("E2E context should not persist after logout");
  await expect(context).toHaveValue(/E2E context/);

  await logout(page);

  // Sign in again (new user) and verify storage cleared (textarea starts empty).
  // We create a fresh account to keep tests isolated from DB cleanup needs.
  await registerAndGoToUpload(page);
  await expect(page.getByPlaceholder(/paste jd/i)).toHaveValue("");

  await assertNoConsoleErrors();
});

test("golden path: upload 2 docs → generate insights → view compare dashboard → refresh", async ({ page }) => {
  // Why: core MVP value; must not regress.
  const assertNoConsoleErrors = attachConsoleErrorFail(page);

  await registerAndGoToUpload(page);

  const a = await makePdfFixture(
    "Resume: Alice Example. 10 years PM. Metrics: +25% conversion.",
    "alice.pdf"
  );
  const b = await makePdfFixture(
    "Resume: Bob Example. 7 years PM. Vague impact; no metrics.",
    "bob.pdf"
  );

  // Hidden file input still exists; Playwright can set files even if hidden.
  await page.locator('input[type="file"]').setInputFiles([a, b]);

  await page.getByRole("button", { name: /generate insights/i }).click();

  await expect(page).toHaveURL(/\/compare\//, { timeout: 120_000 });
  await expect(page.getByRole("heading", { name: /resume comparison/i })).toBeVisible({
    timeout: 120_000
  });

  await page.reload();
  await expect(page.getByRole("heading", { name: /resume comparison/i })).toBeVisible();

  await assertNoConsoleErrors();
});

test("regression: multi-tab logout invalidates protected routes after refresh", async ({ browser }) => {
  // Why: ensures no stale protected UI survives across tabs after logout.
  const context = await browser.newContext();
  const page1 = await context.newPage();
  const page2 = await context.newPage();
  const assert1 = attachConsoleErrorFail(page1);
  const assert2 = attachConsoleErrorFail(page2);

  await registerAndGoToUpload(page1);
  await page2.goto("/upload");
  await expect(page2.getByRole("heading", { name: /upload documents/i })).toBeVisible();

  await logout(page1);

  await page2.reload();
  await page2.waitForLoadState("domcontentloaded");

  const cookiesAfter = await context.cookies();
  const storage = await context.storageState();
  const hasSessionCookie =
    cookiesAfter.some((c) => c.name === "specsheet_session") ||
    storage.cookies.some((c) => c.name === "specsheet_session");

  const debug = `url=${page2.url()}\n` +
    `hasSessionCookie=${hasSessionCookie}\n` +
    `cookies=${cookiesAfter.map((c) => `${c.name} (${c.domain}${c.path})`).join(", ")}`;

  // Middleware redirect is the true enforcement; assert login UI is shown.
  await expect(page2.getByRole("button", { name: /^sign in$/i }), debug).toBeVisible();

  await assert1();
  await assert2();
});

test("invalid input: selecting 1 file shows actionable error", async ({ page }) => {
  // Why: common user mistake; must provide clear guidance.
  const assertNoConsoleErrors = attachConsoleErrorFail(page);
  await registerAndGoToUpload(page);

  const one = await makePdfFixture("Only one doc", "one.pdf");
  await page.locator('input[type="file"]').setInputFiles([one]);

  await expect(page.getByText(/upload between 2 and 5 files/i)).toBeVisible();

  await assertNoConsoleErrors();
});

