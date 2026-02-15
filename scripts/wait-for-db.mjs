#!/usr/bin/env node
/**
 * Starts Docker (Postgres + MinIO) and waits for Postgres to be reachable.
 * Run before `next dev` so the app has a database (e.g. npm run dev).
 */
import { spawnSync } from "child_process";
import net from "net";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

function isPortOpen(host, port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const onError = () => {
      socket.destroy();
      resolve(false);
    };
    socket.setTimeout(2000);
    socket.once("error", onError);
    socket.once("timeout", onError);
    socket.connect(port, host, () => {
      socket.destroy();
      resolve(true);
    });
  });
}

async function waitForPort(host, port, maxAttempts = 30, intervalMs = 2000) {
  for (let i = 0; i < maxAttempts; i++) {
    if (await isPortOpen(host, port)) return true;
    if (i < maxAttempts - 1) {
      console.log(`Waiting for database at ${host}:${port}... (${i + 1}/${maxAttempts})`);
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  }
  return false;
}

function runDockerUp() {
  console.log("Starting database and file storage (Docker)...");
  const r = spawnSync("docker", ["compose", "up", "-d"], {
    cwd: projectRoot,
    shell: true,
    stdio: "inherit"
  });
  return r.status === 0;
}

async function main() {
  const host = "127.0.0.1";
  const port = 5432;

  const dockerStarted = runDockerUp();
  if (!dockerStarted) {
    console.warn("Could not start Docker (is Docker Desktop running?). Starting app anyway; you may see a database error on login.");
  }

  const ok = await waitForPort(host, port);
  if (!ok) {
    console.warn(`Database not ready at ${host}:${port}. Start it with: docker compose up -d. Starting app anyway.`);
  } else {
    console.log("Database is ready.");
  }
}

main();
