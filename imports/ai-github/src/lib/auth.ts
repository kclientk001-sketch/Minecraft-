import "server-only";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { digest } from "@/lib/auth-crypto";
import { HttpError } from "@/lib/http";
export const COOKIE =
  process.env.NODE_ENV === "production" ? "__Host-mc_session" : "mc_session";
export const sessionOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
  maxAge: 28800,
};
export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  await db.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  await db.session.create({
    data: {
      tokenHash: digest(token),
      userId,
      expiresAt: new Date(Date.now() + 28800000),
    },
  });
  return token;
}
export async function session(token?: string) {
  if (!token || token.length > 100) return null;
  const s = await db.session.findUnique({
    where: { tokenHash: digest(token) },
    include: { user: true },
  });
  if (!s || s.expiresAt <= new Date() || !s.user.active) return null;
  return {
    id: s.user.id,
    email: s.user.email,
    name: s.user.name,
    role: s.user.role,
  };
}
export async function currentUser() {
  return session((await cookies()).get(COOKIE)?.value);
}
export async function requireUser(request: NextRequest, adminOnly = false) {
  const u = await session(request.cookies.get(COOKIE)?.value);
  if (!u) throw new HttpError(401, "Vui lòng đăng nhập.");
  if (
    !["ADMIN", "EDITOR"].includes(u.role) ||
    (adminOnly && u.role !== "ADMIN")
  )
    throw new HttpError(403, "Bạn không có quyền thực hiện thao tác này.");
  return u;
}
