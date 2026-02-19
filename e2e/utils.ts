import { expect, type Page } from "@playwright/test";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

export function attachConsoleErrorFail(page: Page) {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(String(err)));

  return async () => {
    expect(errors, `Console/page errors detected:\n${errors.join("\n")}`).toEqual([]);
  };
}

export async function registerAndGoToUpload(page: Page) {
  const email = `e2e+${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
  const password = "TestPass!234";

  await page.goto("/login");
  await page.getByRole("button", { name: /create an account/i }).click();

  await page.getByPlaceholder("you@company.com").fill(email);
  await page.getByPlaceholder("••••••••").fill(password);
  await page.getByRole("button", { name: /create your account/i }).click();

  await expect(page).toHaveURL(/\/upload$/);
}

export async function logout(page: Page) {
  await page.getByRole("button", { name: /sign out/i }).click();
  await expect(page).toHaveURL(/\/login$/);
}

export async function makePdfFixture(text: string, filename: string) {
  const dir = path.join(os.tmpdir(), "decision-compare-e2e");
  await mkdir(dir, { recursive: true });

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  page.drawText(text, { x: 48, y: 740, size: 14, font, color: rgb(0, 0, 0) });

  const bytes = await pdf.save();
  const filePath = path.join(dir, filename);
  await writeFile(filePath, bytes);
  return filePath;
}

