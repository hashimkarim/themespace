import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";
import type { ThemeStorage } from "./storage";

export function getDb() {
  if (!env.DB) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Set the `d1` field in .openai/hosting.json to `DB` or let your control plane inject the real binding values before using the database.",
    );
  }

  return drizzle(env.DB, { schema });
}

export function getStorage(): ThemeStorage {
  if (!env.DB) throw new Error("Theme storage is unavailable.");
  return {
    prepare: (sql) => env.DB.prepare(sql),
    batch: (statements) =>
      env.DB.batch(statements.map((sql) => env.DB.prepare(sql))),
  };
}

export function getRuntimeConfig() {
  return {
    secret: env.BETTER_AUTH_SECRET || process.env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL || process.env.BETTER_AUTH_URL,
    ipAddressHeaders: ["cf-connecting-ip"],
  };
}
