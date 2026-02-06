import { rm } from "node:fs/promises";

const targets = [".next", ".turbo", "node_modules/.cache"];

await Promise.all(
  targets.map(async (p) => {
    try {
      await rm(p, { recursive: true, force: true });
      // eslint-disable-next-line no-console
      console.log(`[clean] removed ${p}`);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log(`[clean] skipped ${p}: ${e instanceof Error ? e.message : String(e)}`);
    }
  })
);

