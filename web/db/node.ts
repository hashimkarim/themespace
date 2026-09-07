import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import type { SqlValue, StorageQuery, ThemeStorage } from "./storage";

let connection: Database.Database | undefined;
function sqlite() {
  if (!connection) {
    const configuredPath = process.env.DATABASE_PATH;
    if (!configuredPath && process.env.NODE_ENV === "production")
      throw new Error("Set DATABASE_PATH to a persistent SQLite file.");
    const file = resolve(configuredPath || ".data/themespace.sqlite");
    mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
    connection = new Database(file);
    connection.pragma("journal_mode = WAL");
    connection.pragma("foreign_keys = ON");
    connection.pragma("busy_timeout = 5000");
  }
  return connection;
}

export function getDb() {
  return drizzle(sqlite(), { schema });
}

// Theme queries share a small interface with D1. Better Auth uses Drizzle's
// native SQLite driver above; credentials and sessions stay library-managed.
export function getStorage(): ThemeStorage {
  const db = sqlite();
  function query(sql: string, values: SqlValue[] = []): StorageQuery {
    return {
      bind: (...bound) => query(sql, bound),
      first: async <T>() =>
        (db.prepare(sql).get(...values) as T | undefined) ?? null,
      all: async <T>() => ({ results: db.prepare(sql).all(...values) as T[] }),
      run: async () => db.prepare(sql).run(...values),
    };
  }
  return {
    prepare: (sql) => query(sql),
    batch: async (statements) =>
      db.transaction(() => {
        for (const sql of statements) db.prepare(sql).run();
      })(),
  };
}

export function getRuntimeConfig() {
  return {
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL,
    // The app port is private. Traefik replaces this header with the peer IP;
    // public DNS points directly to Traefik (no additional proxy hop).
    ipAddressHeaders: ["x-real-ip"],
  };
}
