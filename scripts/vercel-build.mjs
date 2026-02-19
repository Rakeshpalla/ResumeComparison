#!/usr/bin/env node
/**
 * Vercel build script: ensures DATABASE_URL exists for prisma generate.
 * Prisma generate only needs the env var for schema validation; it does not connect.
 * If DATABASE_URL is not set (e.g. first deploy before adding env vars), use a placeholder.
 */
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import { resolve, dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    "postgresql://placeholder:placeholder@localhost:5432/placeholder";
}
if (!process.env.DIRECT_DATABASE_URL) {
  process.env.DIRECT_DATABASE_URL = process.env.DATABASE_URL;
}

const opts = { stdio: "inherit", cwd: root, shell: true };

try {
  execSync("npx prisma generate", opts);
  execSync("npx next build", opts);
} catch (err) {
  process.exit(err?.status ?? 1);
}
