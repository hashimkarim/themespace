import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

// Creates local configuration only; never print the generated secret.
let content = await readFile(".env", "utf8").catch((error) => {
  if (error.code !== "ENOENT") throw error;
  return "";
});
for (const [key, value] of Object.entries({
  SITE_URL: "http://localhost:5173",
  BETTER_AUTH_URL: "http://localhost:5173",
  BETTER_AUTH_SECRET: randomBytes(32).toString("base64"),
})) {
  const pattern = new RegExp(`^${key}=([^\\r\\n]*)$`, "m");
  const existing = content.match(pattern);
  if (existing?.[1]?.trim()) continue;
  content = existing
    ? content.replace(pattern, `${key}=${value}`)
    : `${content.trimEnd()}\n${key}=${value}\n`;
}
await writeFile(".env", content, { mode: 0o600 });
console.log(
  "Local auth configuration is ready in .env. Restart the dev server to load it.",
);
