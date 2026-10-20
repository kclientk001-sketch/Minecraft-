import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.APP_URL || "http://localhost:3000").replace(
    /\/$/,
    "",
  );
  const [news, modes, products] = await Promise.all([
    db.news.findMany({
      where: { published: true },
      select: { slug: true, updatedAt: true },
    }),
    db.gameMode.findMany({ where: { enabled: true }, select: { slug: true } }),
    db.product.findMany({ where: { enabled: true }, select: { slug: true } }),
  ]);
  return [
    ...[
      "",
      "/news",
      "/game-modes",
      "/leaderboards",
      "/store",
      "/vote",
      "/rules",
      "/support",
      "/privacy",
    ].map((path) => ({
      url: `${base}${path}`,
      changeFrequency: "weekly" as const,
      priority: path ? 0.7 : 1,
    })),
    ...news.map((n) => ({
      url: `${base}/news/${n.slug}`,
      lastModified: n.updatedAt,
    })),
    ...modes.map((m) => ({ url: `${base}/game-modes/${m.slug}` })),
    ...products.map((p) => ({ url: `${base}/store/${p.slug}` })),
  ];
}
