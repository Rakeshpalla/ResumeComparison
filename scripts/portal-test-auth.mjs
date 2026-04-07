#!/usr/bin/env node
/**
 * Playwright webServer helper.
 * Ensures auth-required mode is enabled for E2E runs.
 */
import { spawn } from "child_process";

process.env.REQUIRE_LOGIN = "true";
process.env.NEXT_PUBLIC_REQUIRE_LOGIN = "true";

const child = spawn("npm", ["run", "portal:test"], {
  stdio: "inherit",
  shell: true,
  env: process.env
});

child.on("exit", (code) => process.exit(code ?? 1));

