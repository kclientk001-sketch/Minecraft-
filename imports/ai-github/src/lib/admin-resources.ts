import "server-only";
import { db } from "@/lib/db";
import {
  newsSchema,
  modeSchema,
  productSchema,
  ruleSchema,
  linkSchema,
  rankingSchema,
  configSchema,
} from "@/lib/validation";
import { getConfig } from "@/lib/content";
import { HttpError } from "@/lib/http";
import { z } from "zod";
export const resources = {
  news: {
    list: () => db.news.findMany({ orderBy: { createdAt: "desc" } }),
    create: (v: unknown) => db.news.create({ data: newsSchema.parse(v) }),
    update: (id: string, v: unknown) =>
      db.news.update({ where: { id }, data: newsSchema.parse(v) }),
    remove: (id: string) => db.news.delete({ where: { id } }),
  },
  modes: {
    list: () => db.gameMode.findMany({ orderBy: { order: "asc" } }),
    create: (v: unknown) => db.gameMode.create({ data: modeSchema.parse(v) }),
    update: (id: string, v: unknown) =>
      db.gameMode.update({ where: { id }, data: modeSchema.parse(v) }),
    remove: (id: string) => db.gameMode.delete({ where: { id } }),
  },
  products: {
    list: () => db.product.findMany({ orderBy: { name: "asc" } }),
    create: (v: unknown) => db.product.create({ data: productSchema.parse(v) }),
    update: (id: string, v: unknown) =>
      db.product.update({ where: { id }, data: productSchema.parse(v) }),
    remove: (id: string) => db.product.delete({ where: { id } }),
  },
  rules: {
    list: () => db.rule.findMany({ orderBy: { order: "asc" } }),
    create: (v: unknown) => db.rule.create({ data: ruleSchema.parse(v) }),
    update: (id: string, v: unknown) =>
      db.rule.update({ where: { id }, data: ruleSchema.parse(v) }),
    remove: (id: string) => db.rule.delete({ where: { id } }),
  },
  links: {
    list: () => db.link.findMany({ orderBy: { order: "asc" } }),
    create: (v: unknown) => db.link.create({ data: linkSchema.parse(v) }),
    update: (id: string, v: unknown) =>
      db.link.update({ where: { id }, data: linkSchema.parse(v) }),
    remove: (id: string) => db.link.delete({ where: { id } }),
  },
  rankings: {
    list: () => db.leaderboardEntry.findMany({ orderBy: { value: "desc" } }),
    create: (v: unknown) =>
      db.leaderboardEntry.create({ data: rankingSchema.parse(v) }),
    update: (id: string, v: unknown) =>
      db.leaderboardEntry.update({
        where: { id },
        data: rankingSchema.parse(v),
      }),
    remove: (id: string) => db.leaderboardEntry.delete({ where: { id } }),
  },
  settings: {
    list: async () => [{ id: "site", ...(await getConfig()) }],
    create: async (v: unknown) =>
      db.siteSetting.upsert({
        where: { id: "site" },
        create: { id: "site", value: configSchema.parse(v) },
        update: { value: configSchema.parse(v) },
      }),
    update: async (_id: string, v: unknown) =>
      db.siteSetting.upsert({
        where: { id: "site" },
        create: { id: "site", value: configSchema.parse(v) },
        update: { value: configSchema.parse(v) },
      }),
    remove: async () => {
      throw new HttpError(405, "Không thể xóa cấu hình.");
    },
  },
  tickets: {
    list: () =>
      db.supportTicket.findMany({ orderBy: { createdAt: "desc" }, take: 500 }),
    create: async () => {
      throw new HttpError(405, "Dùng form hỗ trợ.");
    },
    update: (id: string, v: unknown) =>
      db.supportTicket.update({
        where: { id },
        data: z
          .object({ status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED"]) })
          .parse(v),
      }),
    remove: (id: string) => db.supportTicket.delete({ where: { id } }),
  },
};
export type Resource = keyof typeof resources;
export function resource(key: string) {
  if (!Object.hasOwn(resources, key))
    throw new HttpError(404, "Không tìm thấy tài nguyên.");
  return resources[key as Resource];
}
export const adminOnly = (key: string) =>
  ["settings", "rankings", "tickets"].includes(key);
