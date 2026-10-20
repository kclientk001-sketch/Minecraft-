import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { loginSchema } from "@/lib/validation";
import { checkOrigin, readJson, handle, HttpError } from "@/lib/http";
import { createSession, COOKIE, sessionOptions } from "@/lib/auth";
import { verifyPassword, hashPassword } from "@/lib/auth-crypto";
import { limit, clientKey } from "@/lib/rate-limit";
export const runtime = "nodejs";
// Equal-cost verification for unknown accounts, generated once per process.
const dummy = hashPassword("unusable-" + crypto.randomUUID());
export async function POST(req: Request) {
  return handle(async () => {
    checkOrigin(req);
    await limit(`login-ip:${clientKey(req)}`, 30, 900000);
    const data = loginSchema.parse(await readJson(req, 4096));
    await limit(`login-email:${data.email}`, 8, 900000);
    const user = await db.user.findUnique({ where: { email: data.email } });
    const valid = await verifyPassword(
      data.password,
      user?.passwordHash || (await dummy),
    );
    if (!valid || !user?.active || !["ADMIN", "EDITOR"].includes(user.role))
      throw new HttpError(401, "Email hoặc mật khẩu không đúng.");
    const token = await createSession(user.id);
    const res = NextResponse.json({ ok: true });
    res.cookies.set(COOKIE, token, sessionOptions);
    return res;
  });
}
