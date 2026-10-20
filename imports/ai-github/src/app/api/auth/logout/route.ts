import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { digest } from "@/lib/auth-crypto";
import { COOKIE, sessionOptions } from "@/lib/auth";
import { checkOrigin, handle } from "@/lib/http";
export async function POST(req: NextRequest) {
  return handle(async () => {
    checkOrigin(req);
    const token = req.cookies.get(COOKIE)?.value;
    if (token)
      await db.session.deleteMany({ where: { tokenHash: digest(token) } });
    const res = NextResponse.json({ ok: true });
    res.cookies.set(COOKIE, "", { ...sessionOptions, maxAge: 0 });
    return res;
  });
}
