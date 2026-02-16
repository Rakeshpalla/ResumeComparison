#!/usr/bin/env node
/**
 * Run Prisma migrations against the PRODUCTION database.
 * Loads DATABASE_URL and DIRECT_DATABASE_URL from .env.production (project root).
 *
 * 1. Copy your Neon connection string from Vercel (Settings → Environment Variables).
 * 2. Create .env.production in the project root with:
 *    DATABASE_URL="postgresql://...?sslmode=require"
 *    DIRECT_DATABASE_URL="postgresql://...?sslmode=require"
 * 3. Run: node scripts/migrate-production.mjs
 *    Or: npm run migrate:prod
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const envPath = resolve(root, ".env.production");

if (!existsSync(envPath)) {
  console.error("Missing .env.production");
  console.error("");
  console.error("1. In Vercel: Project → Settings → Environment Variables");
  console.error("2. Copy the value of DATABASE_URL (your Neon connection string)");
  console.error("3. Create a file named .env.production in the project root with:");
  console.error("");
  console.error('   DATABASE_URL="postgresql://user:pass@host/neondb?sslmode=require"');
  console.error('   DIRECT_DATABASE_URL="postgresql://user:pass@host/neondb?sslmode=require"');
  console.error("");
  console.error("4. Run again: npm run migrate:prod");
  process.exit(1);
}

const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eq = trimmed.indexOf("=");
  if (eq === -1) continue;
  const key = trimmed.slice(0, eq).trim();
  const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
  if (key === "DATABASE_URL" || key === "DIRECT_DATABASE_URL") {
    process.env[key] = value;
  }
}

if (!process.env.DATABASE_URL) {
  console.error(".env.production must define DATABASE_URL");
  process.exit(1);
}
if (!process.env.DIRECT_DATABASE_URL) {
  process.env.DIRECT_DATABASE_URL = process.env.DATABASE_URL;
}

console.log("Running Prisma migrations against production database...");
execSync("npx prisma migrate deploy", {
  stdio: "inherit",
  cwd: root,
  env: { ...process.env },
});
console.log("Done.");
