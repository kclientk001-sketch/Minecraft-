import { z } from "zod";
import { db } from "@/lib/db";
import { rankingSchema } from "@/lib/validation";
import { secretEqual } from "@/lib/auth-crypto";
import { handle, readJson, HttpError } from "@/lib/http";
import { limit, clientKey } from "@/lib/rate-limit";
const batch = z.object({
  entries: z
    .array(rankingSchema.omit({ isDemo: true }))
    .min(1)
    .max(500),
});
export async function POST(req: Request) {
  return handle(async () => {
    await limit(`ingest:${clientKey(req)}`, 60, 60000);
    const token = process.env.STATS_INGEST_TOKEN;
    if (!token || token.length < 32)
      throw new HttpError(503, "Chưa bật tích hợp thống kê.");
    if (!secretEqual(req.headers.get("authorization") || "", `Bearer ${token}`))
      throw new HttpError(401, "Không được phép.");
    const { entries } = batch.parse(await readJson(req, 150000));
    await db.$transaction(async (tx) => {
      await tx.leaderboardEntry.deleteMany({
        where: {
          isDemo: true,
          metric: { in: [...new Set(entries.map((e) => e.metric))] },
        },
      });
      for (const e of entries)
        await tx.leaderboardEntry.upsert({
          where: { metric_player: { metric: e.metric, player: e.player } },
          create: { ...e, isDemo: false },
          update: { ...e, isDemo: false },
        });
    });
    return { ok: true, count: entries.length };
  });
}
