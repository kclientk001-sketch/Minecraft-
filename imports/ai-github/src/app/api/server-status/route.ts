import { publicCors, preflight } from "@/lib/public-cors";
import { getConfig } from "@/lib/content";
import { getStatus } from "@/lib/server-status";
import { handle } from "@/lib/http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  return handle(async () =>
    publicCors(
      req,
      Response.json(await getStatus(await getConfig()), {
        headers: {
          "Cache-Control": "public, max-age=15, stale-while-revalidate=30",
        },
      }),
    ),
  );
}

export const OPTIONS = preflight;
