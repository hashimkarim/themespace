import { cpSync, mkdirSync } from "node:fs";

mkdirSync("dist/standalone/scripts", { recursive: true });
cpSync(
  "scripts/start-production.mjs",
  "dist/standalone/scripts/start-production.mjs",
);
cpSync("drizzle", "dist/standalone/drizzle", { recursive: true });
