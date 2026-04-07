import { test, expect } from "@playwright/test";
import { attachConsoleErrorFail, registerAndGoToUpload, logout } from "./utils";

test("smoke: signup → upload page → logout", async ({ page }) => {
  const assertNoConsoleErrors = attachConsoleErrorFail(page);

  await registerAndGoToUpload(page);
  await expect(page.getByRole("heading", { name: "Upload Resumes", exact: true })).toBeVisible();

  await logout(page);

  await assertNoConsoleErrors();
});

