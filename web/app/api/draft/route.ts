import { apiFailure, database, readTheme, requireOwner } from "@/lib/store";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const user = await requireOwner(),
      db = await database();
    const row = await db
      .prepare("SELECT body, updated_at FROM theme_drafts WHERE owner_id = ?")
      .bind(user.userId)
      .first<{ body: string; updated_at: string }>();
    return Response.json(
      {
        theme: row ? JSON.parse(row.body) : null,
        updatedAt: row?.updated_at ?? null,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiFailure(error);
  }
}
export async function PUT(request: Request) {
  try {
    const user = await requireOwner(request),
      theme = await readTheme(request),
      db = await database(),
      now = new Date().toISOString();
    await db
      .prepare(
        "INSERT INTO theme_drafts (owner_id, body, updated_at) VALUES (?, ?, ?) ON CONFLICT(owner_id) DO UPDATE SET body=excluded.body, updated_at=excluded.updated_at",
      )
      .bind(user.userId, JSON.stringify(theme), now)
      .run();
    return Response.json({ updatedAt: now });
  } catch (error) {
    return apiFailure(error);
  }
}
