import { NextRequest } from "next/server";
import { resource, adminOnly } from "@/lib/admin-resources";
import { requireUser } from "@/lib/auth";
import { checkOrigin, readJson, handle } from "@/lib/http";
type Context = { params: Promise<{ resource: string }> };
export async function GET(req: NextRequest, c: Context) {
  return handle(async () => {
    const p = await c.params;
    await requireUser(req, adminOnly(p.resource));
    return resource(p.resource).list();
  });
}
export async function POST(req: NextRequest, c: Context) {
  return handle(async () => {
    checkOrigin(req);
    const p = await c.params;
    await requireUser(req, adminOnly(p.resource));
    return resource(p.resource).create(await readJson(req));
  });
}
