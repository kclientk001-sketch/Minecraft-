import "server-only";
import { checkOrigin } from "@/lib/http";
function allowed(req: Request) {
  const origin = req.headers.get("origin");
  const configured = process.env.STATIC_SITE_ORIGIN;
  return !!origin && !!configured && origin === configured;
}
export function checkPublicOrigin(req: Request) {
  if (!allowed(req)) checkOrigin(req);
}
export function publicCors(req: Request, response: Response) {
  if (process.env.STATIC_SITE_ORIGIN) response.headers.set("Vary", "Origin");
  if (allowed(req)) {
    response.headers.set(
      "Access-Control-Allow-Origin",
      process.env.STATIC_SITE_ORIGIN!,
    );
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type");
    response.headers.set("Vary", "Origin");
  }
  return response;
}
export function preflight(req: Request) {
  return publicCors(
    req,
    new Response(null, { status: allowed(req) ? 204 : 403 }),
  );
}
