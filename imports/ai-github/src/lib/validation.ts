import { z } from "zod";
const text = (max: number) =>
  z.string().trim().min(1, "Không được bỏ trống").max(max);
const slug = text(100).regex(
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  "Dùng chữ thường, số và dấu gạch nối",
);
const asset = z
  .string()
  .regex(
    /^\/images\/[a-zA-Z0-9_-]+\.(webp|png|jpg|svg)$/,
    "Chọn tài nguyên trong /images/",
  );
export const safeUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => {
    try {
      const u = new URL(v);
      return u.protocol === "https:" && !u.username && !u.password;
    } catch {
      return /^\/(?!\/)[a-zA-Z0-9/_#?=&.-]*$/.test(v);
    }
  }, "Cần URL HTTPS hoặc đường dẫn nội bộ");
export const newsSchema = z.object({
  slug,
  title: text(180),
  excerpt: text(500),
  body: text(40000),
  category: text(50),
  image: asset,
  published: z.boolean(),
  isDemo: z.boolean(),
});
export const modeSchema = z.object({
  slug,
  name: text(70),
  description: text(300),
  details: text(8000),
  image: asset,
  accent: z.enum(["cyan", "violet", "amber", "green", "rose"]),
  enabled: z.boolean(),
  order: z.number().int().min(0).max(999),
});
export const productSchema = z.object({
  slug,
  name: text(100),
  description: text(8000),
  category: z.enum(["Ranks", "Cosmetics", "Crates", "Pets", "Boosters"]),
  price: z.number().int().min(0).max(1000000000),
  currency: z.enum(["VND", "USD", "EUR"]),
  image: asset,
  enabled: z.boolean(),
  isDemo: z.boolean(),
});
export const ruleSchema = z.object({
  slug,
  title: text(100),
  body: text(20000),
  order: z.number().int().min(0).max(999),
});
export const linkSchema = z.object({
  label: text(80),
  url: safeUrl,
  kind: z.enum(["vote", "social", "quick"]),
  enabled: z.boolean(),
  order: z.number().int().min(0).max(999),
});
export const metricSchema = z.enum([
  "playtime",
  "kills",
  "wins",
  "bedwars",
  "skypvp",
  "purchasers",
]);
export const rankingSchema = z.object({
  metric: metricSchema,
  player: text(16).regex(/^[A-Za-z0-9_]{3,16}$/),
  value: z.number().int().min(0).max(2147483647),
  unit: text(20),
  isDemo: z.boolean(),
  source: text(120),
});
export const configSchema = z.object({
  SERVER_NAME: text(70),
  SERVER_IP: text(253).regex(/^[a-zA-Z0-9](?:[a-zA-Z0-9.-]*[a-zA-Z0-9])?$/),
  SERVER_PORT: z.number().int().min(1).max(65535),
  SERVER_VERSION: text(100),
  DISCORD_INVITE: z
    .string()
    .url()
    .refine(
      (v) =>
        /^https:\/\/(discord\.gg|discord\.com\/invite)\/[a-zA-Z0-9-]+$/.test(v),
      "URL Discord không hợp lệ",
    ),
  DISCORD_GUILD_ID: z.string().regex(/^(\d{17,20})?$/),
  STORE_URL: safeUrl,
  LANGUAGE: z.literal("vi"),
  THEME: z.literal("dark"),
  DEMO_MODE: z.boolean(),
  TAGLINE: text(160),
  DESCRIPTION: text(1000),
  VOTE_REWARDS: text(3000),
});
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .max(254)
    .transform((v) => v.toLowerCase()),
  password: z.string().min(1).max(256),
});
export const supportSchema = z.object({
  type: z.enum(["REPORT", "APPEAL", "SUPPORT"]),
  player: z
    .string()
    .trim()
    .min(3, "Tên Minecraft từ 3–16 ký tự")
    .max(16, "Tên Minecraft từ 3–16 ký tự")
    .regex(/^[A-Za-z0-9_]{3,16}$/, "Tên Minecraft từ 3–16 ký tự"),
  email: z.string().trim().email("Email không hợp lệ").max(254),
  subject: text(150),
  message: text(6000).min(20, "Nội dung cần ít nhất 20 ký tự"),
  evidenceUrl: z.union([
    z.literal(""),
    z
      .string()
      .url()
      .max(500)
      .refine((v) => v.startsWith("https://"), "Chỉ chấp nhận HTTPS"),
  ]),
  website: z.string().max(0),
});
