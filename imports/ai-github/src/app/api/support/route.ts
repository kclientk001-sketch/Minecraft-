import { checkPublicOrigin, publicCors, preflight } from "@/lib/public-cors";
import { db } from "@/lib/db";
import { supportSchema } from "@/lib/validation";
import { readJson, handle } from "@/lib/http";
import { limit, clientKey } from "@/lib/rate-limit";
export async function POST(req: Request) {
  const res = await handle(async () => {
    checkPublicOrigin(req);
    await limit(`support:${clientKey(req)}`, 8, 3600000);
    const { website: honeypot, ...data } = supportSchema.parse(
      await readJson(req, 10000),
    );
    void honeypot;
    await limit(`support-email:${data.email.toLowerCase()}`, 3, 3600000);
    const ticket = await db.supportTicket.create({ data });
    return {
      ok: true,
      id: ticket.id,
      message: "Yêu cầu đã được lưu. Quản trị viên có thể xem trong dashboard.",
    };
  });
  return publicCors(req, res);
}

export const OPTIONS = preflight;
