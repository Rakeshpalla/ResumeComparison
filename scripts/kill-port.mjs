import { execSync } from "node:child_process";

function killOnWindows(port) {
  const out = execSync("netstat -ano -p tcp", { encoding: "utf8" });
  const lines = out.split(/\r?\n/);
  const pids = new Set();

  for (const line of lines) {
    // Example:
    // TCP    0.0.0.0:3000      0.0.0.0:0      LISTENING       12345
    const parts = line.trim().split(/\s+/);
    if (parts.length < 5) continue;
    const proto = parts[0]?.toUpperCase();
    const local = parts[1];
    const state = parts[3]?.toUpperCase();
    const pid = parts[4];
    if (proto !== "TCP") continue;
    if (!local?.endsWith(`:${port}`)) continue;
    if (state !== "LISTENING") continue;
    const n = Number(pid);
    if (Number.isFinite(n) && n > 0) pids.add(n);
  }

  for (const pid of pids) {
    try {
      execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
      // eslint-disable-next-line no-console
      console.log(`[port] killed PID ${pid} on :${port}`);
    } catch {
      // ignore
    }
  }
}

function main() {
  const port = Number(process.argv[2] || "3000");
  if (!Number.isFinite(port) || port <= 0) process.exit(0);

  if (process.platform === "win32") {
    killOnWindows(port);
    return;
  }

  // Best-effort for non-Windows (not required for your current environment).
  try {
    execSync(`lsof -ti tcp:${port} | xargs kill -9`, { stdio: "ignore" });
    // eslint-disable-next-line no-console
    console.log(`[port] killed processes on :${port}`);
  } catch {
    // ignore
  }
}

main();

