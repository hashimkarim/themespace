import { getChatGPTUser } from "@/app/chatgpt-auth";
export const dynamic = "force-dynamic";
export async function GET() {
  const user = await getChatGPTUser();
  return Response.json(
    { user: user ? { displayName: user.displayName } : null },
    { headers: { "Cache-Control": "no-store" } },
  );
}
