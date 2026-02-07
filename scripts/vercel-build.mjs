#!/usr/bin/env node
/**
 * Vercel build script: ensures DATABASE_URL exists for prisma generate.
 * Prisma generate only needs the env var for schema validation; it does not connect.
 * If DATABASE_URL is not set (e.g. first deploy before adding env vars), use a placeholder.
 */
import { execSync } from "child_process";

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    "postgresql://placeholder:placeholder@localhost:5432/placeholder";
}

execSync("prisma generate", { stdio: "inherit" });
execSync("next build", { stdio: "inherit" });
