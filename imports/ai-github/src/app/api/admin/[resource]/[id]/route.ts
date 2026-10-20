import { NextRequest } from "next/server";
import { resource, adminOnly } from "@/lib/admin-resources";
import { requireUser } from "@/lib/auth";
import { checkOrigin, readJson, handle } from "@/lib/http";
type Context = { params: Promise<{ resource: string; id: string }> };
export async function PATCH(req: NextRequest, c: Context) {
  return handle(async () => {
    checkOrigin(req);
    const p = await c.params;
    await requireUser(req, adminOnly(p.resource));
    return resource(p.resource).update(p.id, await readJson(req));
  });
}
export async function DELETE(req: NextRequest, c: Context) {
  return handle(async () => {
    checkOrigin(req);
    const p = await c.params;
    await requireUser(req, adminOnly(p.resource));
    await resource(p.resource).remove(p.id);
    return { ok: true };
  });
}
