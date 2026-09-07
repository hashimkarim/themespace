import { getStorage } from "@/db";
import { getAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await getAuth();
    await getStorage().prepare("SELECT 1 AS ready").first();
    return Response.json(
      { status: "ok" },
      {
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch {
    return Response.json({ status: "unavailable" }, { status: 503 });
  }
}
