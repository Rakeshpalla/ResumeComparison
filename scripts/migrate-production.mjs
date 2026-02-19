#!/usr/bin/env node
/**
 * Run Prisma migrations against the PRODUCTION database.
 * Loads DATABASE_URL and DIRECT_DATABASE_URL from:
 *   - .env.production (plain KEY=value), or
 *   - .env.production.json (JSON or KEY=value lines).
 *
 * Run: npm run migrate:prod
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const envPath = resolve(root, ".env.production");
const envJsonPath = resolve(root, ".env.production.json");

function loadEnvFromPath(filePath) {
  const content = readFileSync(filePath, "utf8").trim();
  try {
    const parsed = JSON.parse(content);
    if (parsed.DATABASE_URL) process.env.DATABASE_URL = parsed.DATABASE_URL;
    if (parsed.DIRECT_DATABASE_URL) process.env.DIRECT_DATABASE_URL = parsed.DIRECT_DATABASE_URL;
    return;
  } catch {
    /* not JSON, parse as KEY=value lines */
  }
  for (const line of content.split(/\r?\n/)) {
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
}

if (existsSync(envPath)) {
  loadEnvFromPath(envPath);
} else if (existsSync(envJsonPath)) {
  loadEnvFromPath(envJsonPath);
} else {
  console.error("Missing .env.production or .env.production.json in project root.");
  console.error("");
  console.error("Add one of these with your Neon DATABASE_URL from Vercel, then run: npm run migrate:prod");
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error(".env.production or .env.production.json must define DATABASE_URL");
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
