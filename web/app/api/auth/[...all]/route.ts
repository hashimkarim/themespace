import { getAuth } from "@/lib/auth";
export const dynamic = "force-dynamic";

async function handler(request: Request) {
  try {
    return await (await getAuth()).handler(request);
  } catch (error) {
    console.error(
      "ThemeSpace auth unavailable:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return Response.json(
      {
        message:
          "Account sign-in is temporarily unavailable. Please try again shortly.",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
export { handler as GET, handler as POST };
