import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { hashPassword } from "../src/lib/auth-crypto";
const schema = z.object({
  ADMIN_EMAIL: z
    .string()
    .email()
    .transform((v) => v.toLowerCase()),
  ADMIN_PASSWORD: z.string().min(14, "Cần ít nhất 14 ký tự").max(256),
  ADMIN_NAME: z.string().min(1).default("Administrator"),
  ADMIN_ROLE: z.enum(["ADMIN", "EDITOR"]).default("ADMIN"),
});
const db = new PrismaClient();
async function main() {
  const d = schema.parse(process.env);
  const existing = await db.user.findUnique({
    where: { email: d.ADMIN_EMAIL },
  });
  if (existing)
    throw new Error(
      "Tài khoản đã tồn tại. Script không ghi đè mật khẩu hoặc quyền.",
    );
  await db.user.create({
    data: {
      email: d.ADMIN_EMAIL,
      name: d.ADMIN_NAME,
      role: d.ADMIN_ROLE,
      passwordHash: await hashPassword(d.ADMIN_PASSWORD),
    },
  });
  console.log(
    "Đã tạo tài khoản quản trị. Hãy xóa ADMIN_PASSWORD khỏi môi trường.",
  );
}
main()
  .catch((e) => {
    console.error(
      e instanceof z.ZodError
        ? e.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n")
        : e.message,
    );
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
