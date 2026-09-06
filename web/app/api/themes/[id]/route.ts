import { apiFailure, database, toPublished } from "@/lib/store";
export const dynamic = "force-dynamic";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params,
      db = await database();
    const row = await db
      .prepare(
        "SELECT id, body, version, published_at FROM published_themes WHERE id = ?",
      )
      .bind(id)
      .first<{
        id: string;
        body: string;
        version: number;
        published_at: string;
      }>();
    if (!row)
      return Response.json(
        { error: "This theme could not be found." },
        { status: 404 },
      );
    return Response.json(toPublished(row));
  } catch (error) {
    return apiFailure(error);
  }
}
