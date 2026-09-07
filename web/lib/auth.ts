import { headers } from "next/headers";
import { betterAuth } from "better-auth/minimal";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getDb, getRuntimeConfig, getStorage } from "@/db";
import * as schema from "@/db/schema";
import authMigration from "@/drizzle/0001_accounts.sql?raw";
import type { AccountUser } from "./account";

let initialized = false;
async function initializeAuth() {
  if (initialized) return;
  // The additive migration also bootstraps a fresh local D1 preview. Hosted
  // deployments apply this checked-in migration before serving requests.
  const statements = authMigration
    .split("--> statement-breakpoint")
    .map((sql) =>
      sql
        .trim()
        .replace(/^CREATE TABLE /, "CREATE TABLE IF NOT EXISTS ")
        .replace(/^CREATE (UNIQUE )?INDEX /, "CREATE $1INDEX IF NOT EXISTS "),
    )
    .filter(Boolean);
  await getStorage().batch(statements);
  initialized = true;
}

export async function getAuth() {
  const { secret, baseURL, ipAddressHeaders } = getRuntimeConfig();
  if (!secret || secret.length < 32 || !baseURL) {
    throw new Error(
      "Set BETTER_AUTH_SECRET (at least 32 characters) and BETTER_AUTH_URL before enabling accounts.",
    );
  }
  await initializeAuth();
  return betterAuth({
    appName: "ThemeSpace",
    baseURL,
    secret,
    database: drizzleAdapter(getDb(), {
      provider: "sqlite",
      schema,
      transaction: false,
    }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
    },
    session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
    rateLimit: { enabled: true, storage: "database" },
    advanced: {
      cookiePrefix: "themespace",
      ipAddress: { ipAddressHeaders },
    },
    // Email is a login identifier, not a verified claim. Linking and email
    // changes stay disabled until an email verification provider is configured.
    account: { accountLinking: { enabled: false } },
  });
}

export async function getAccountUser(): Promise<AccountUser | null> {
  const requestHeaders = await headers();
  if (!requestHeaders.get("cookie")?.includes("themespace.session_token="))
    return null;
  const auth = await getAuth();
  const current = await auth.api.getSession({ headers: requestHeaders });
  if (!current) return null;
  return {
    id: current.user.id,
    displayName: current.user.name,
    email: current.user.email,
    emailVerified: current.user.emailVerified,
    createdAt: current.user.createdAt.toISOString(),
  };
}
