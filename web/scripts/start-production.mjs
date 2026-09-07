import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { mkdirSync } from "node:fs";
import { dirname, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";

const { DATABASE_PATH, BETTER_AUTH_URL, BETTER_AUTH_SECRET, SITE_URL } =
  process.env;
if (!DATABASE_PATH || !isAbsolute(DATABASE_PATH))
  throw new Error(
    "DATABASE_PATH must be an absolute path on persistent storage.",
  );
if (!BETTER_AUTH_SECRET || BETTER_AUTH_SECRET.length < 32)
  throw new Error("BETTER_AUTH_SECRET must contain at least 32 characters.");
if (!BETTER_AUTH_URL || SITE_URL !== BETTER_AUTH_URL)
  throw new Error(
    "Set SITE_URL and BETTER_AUTH_URL to the same public origin.",
  );
const origin = new URL(BETTER_AUTH_URL);
if (
  origin.origin !== BETTER_AUTH_URL ||
  !["http:", "https:"].includes(origin.protocol)
)
  throw new Error(
    "Use an HTTP(S) origin without a trailing slash for the public URL.",
  );
if (
  origin.protocol !== "https:" &&
  !["localhost", "127.0.0.1"].includes(origin.hostname)
)
  throw new Error("Public deployments require HTTPS.");

mkdirSync(dirname(DATABASE_PATH), { recursive: true, mode: 0o700 });
const db = new Database(DATABASE_PATH);
try {
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");
  migrate(drizzle(db), {
    migrationsFolder: fileURLToPath(new URL("../drizzle", import.meta.url)),
  });
} finally {
  db.close();
}
await import("../server.js");
