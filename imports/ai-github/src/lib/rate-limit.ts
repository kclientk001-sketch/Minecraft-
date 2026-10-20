import "server-only";
import { db } from "@/lib/db";
import { digest } from "@/lib/auth-crypto";
import { HttpError } from "@/lib/http";
let lastCleanup = 0;
export function clientKey(request: Request) {
  return process.env.TRUST_PROXY === "true"
    ? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
    : "shared";
}
export async function limit(key: string, max: number, windowMs: number) {
  const now = Date.now(),
    bucket = Math.floor(now / windowMs);
  const row = await db.rateLimit.upsert({
    where: { key: `${digest(key)}:${bucket}` },
    create: {
      key: `${digest(key)}:${bucket}`,
      count: 1,
      expiresAt: new Date((bucket + 1) * windowMs),
    },
    update: { count: { increment: 1 } },
  });
  if (now - lastCleanup > 3600000) {
    lastCleanup = now;
    await db.rateLimit.deleteMany({
      where: { expiresAt: { lt: new Date(now - 86400000) } },
    });
  }
  if (row.count > max)
    throw new HttpError(429, "Quá nhiều yêu cầu. Vui lòng thử lại sau.");
}
