import { getAccountUser } from "@/lib/auth";
export const dynamic = "force-dynamic";
export async function GET() {
  const user = await getAccountUser();
  return Response.json({ user }, { headers: { "Cache-Control": "no-store" } });
}
