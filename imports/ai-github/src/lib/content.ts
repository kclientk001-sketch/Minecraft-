import "server-only";
import { cache } from "react";
import { defaults } from "@/config/site";
import { configSchema } from "@/lib/validation";
import { db } from "@/lib/db";
import type { SiteConfig } from "@/types";
export const getConfig = cache(async (): Promise<SiteConfig> => {
  const env: Record<string, unknown> = {};
  for (const key of Object.keys(defaults)) {
    if (process.env[key] !== undefined && process.env[key] !== "")
      env[key] = process.env[key];
  }
  if (env.SERVER_PORT) env.SERVER_PORT = Number(env.SERVER_PORT);
  if (env.DEMO_MODE !== undefined) env.DEMO_MODE = env.DEMO_MODE === "true";
  const stored = await db.siteSetting.findUnique({ where: { id: "site" } });
  const parsed = configSchema.safeParse({
    ...defaults,
    ...env,
    ...((stored?.value as object) ?? {}),
  });
  if (!parsed.success)
    throw new Error(
      "Cấu hình website không hợp lệ. Kiểm tra .env và SiteSetting.",
    );
  return parsed.data;
});
export const getModes = cache(() =>
  db.gameMode.findMany({ where: { enabled: true }, orderBy: { order: "asc" } }),
);
export const getLinks = cache(() =>
  db.link.findMany({ where: { enabled: true }, orderBy: { order: "asc" } }),
);
export function pagination(page: unknown, perPage = 9) {
  const n = Math.max(1, Math.min(10000, Number(page) || 1));
  return {
    page: Math.floor(n),
    skip: (Math.floor(n) - 1) * perPage,
    take: perPage,
  };
}
