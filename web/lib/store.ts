import { getStorage } from "@/db";
import { getAccountUser } from "./auth";
import { parseTheme, type Theme } from "./theme";
import { targets } from "./targets";

export type PublishedTheme = {
  id: string;
  theme: Theme;
  version: number;
  publishedAt: string;
};
let initialization: Promise<unknown> | undefined;
export async function database() {
  const db = getStorage();
  initialization ??= db
    .batch([
      "CREATE TABLE IF NOT EXISTS theme_drafts (owner_id TEXT PRIMARY KEY NOT NULL, body TEXT NOT NULL, updated_at TEXT NOT NULL)",
      "CREATE TABLE IF NOT EXISTS published_themes (id TEXT PRIMARY KEY NOT NULL, owner_id TEXT NOT NULL, source_id TEXT NOT NULL, body TEXT NOT NULL, version INTEGER NOT NULL, published_at TEXT NOT NULL)",
      "CREATE INDEX IF NOT EXISTS idx_themes_published_at ON published_themes(published_at)",
      "CREATE UNIQUE INDEX IF NOT EXISTS idx_themes_owner_source_version ON published_themes(owner_id, source_id, version)",
    ])
    .catch((error) => {
      initialization = undefined;
      throw error;
    });
  await initialization;
  return db;
}
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function requireOwner(request?: Request) {
  if (request) {
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin)
      throw new ApiError("This request must come from ThemeSpace.", 403);
  }
  const user = await getAccountUser();
  if (!user) throw new ApiError("Sign in to save or publish your theme.", 401);
  const expectedOwner = request?.headers.get("x-themespace-owner");
  if (expectedOwner && expectedOwner !== user.id)
    throw new ApiError(
      "Your account changed in another tab. Reload before saving.",
      409,
    );
  return { ...user, userId: user.id };
}
export async function readTheme(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError("Choose a theme to save.", 400);
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const next = await reader.read();
    if (next.done) break;
    total += next.value.length;
    if (total > 65_536) {
      await reader.cancel();
      throw new ApiError("Theme files must be under 64 KB.", 413);
    }
    chunks.push(next.value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  try {
    const theme = parseTheme(JSON.parse(new TextDecoder().decode(bytes)));
    if (
      theme.targets.some(
        (id) => !targets.some((t) => t.id === id && t.status === "export"),
      )
    )
      throw new Error("One of the selected export targets is unavailable.");
    return theme;
  } catch (error) {
    throw new ApiError(
      error instanceof Error ? error.message : "Invalid theme.",
      400,
    );
  }
}
export function apiFailure(error: unknown) {
  if (error instanceof ApiError)
    return Response.json({ error: error.message }, { status: error.status });
  console.error(
    "ThemeSpace storage request failed:",
    error instanceof Error ? error.message : error,
  );
  return Response.json(
    {
      error:
        "Could not reach theme storage. Your current edits are still open; please try again.",
    },
    { status: 503 },
  );
}
export function toPublished(row: {
  id: string;
  body: string;
  version: number;
  published_at: string;
}): PublishedTheme {
  return {
    id: row.id,
    theme: parseTheme(JSON.parse(row.body)),
    version: row.version,
    publishedAt: row.published_at,
  };
}
