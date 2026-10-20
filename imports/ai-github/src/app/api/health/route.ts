import { db } from "@/lib/db";
export async function GET() {
  try {
    await db.siteSetting.count();
    return Response.json(
      { status: "ok" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json({ status: "unavailable" }, { status: 503 });
  }
}
