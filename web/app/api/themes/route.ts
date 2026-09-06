import {
  apiFailure,
  database,
  readTheme,
  requireOwner,
  toPublished,
} from "@/lib/store";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const db = await database();
    const rows = await db
      .prepare(
        "SELECT id, body, version, published_at FROM published_themes ORDER BY published_at DESC LIMIT 100",
      )
      .all<{
        id: string;
        body: string;
        version: number;
        published_at: string;
      }>();
    return Response.json(
      { themes: rows.results.map(toPublished) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiFailure(error);
  }
}
export async function POST(request: Request) {
  try {
    const user = await requireOwner(request),
      theme = await readTheme(request),
      db = await database();
    const id = crypto.randomUUID(),
      now = new Date().toISOString();
    const row = await db
      .prepare(
        "INSERT INTO published_themes (id, owner_id, source_id, body, version, published_at) SELECT ?, ?, ?, ?, COALESCE(MAX(version), 0) + 1, ? FROM published_themes WHERE owner_id = ? AND source_id = ? RETURNING id, body, version, published_at",
      )
      .bind(
        id,
        user.userId,
        theme.id,
        JSON.stringify(theme),
        now,
        user.userId,
        theme.id,
      )
      .first<{
        id: string;
        body: string;
        version: number;
        published_at: string;
      }>();
    if (!row) throw new Error("Could not publish theme.");
    return Response.json(toPublished(row), { status: 201 });
  } catch (error) {
    return apiFailure(error);
  }
}
