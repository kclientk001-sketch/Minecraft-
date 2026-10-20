import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { handle } from "@/lib/http";
export async function GET(req: NextRequest) {
  return handle(() => requireUser(req));
}
