import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function checkOrigin(request: Request) {
  const configured = process.env.APP_URL;
  if (process.env.NODE_ENV === "production" && !configured)
    throw new HttpError(503, "Cần cấu hình APP_URL.");
  const expected = new URL(configured || request.url).origin;
  if (request.headers.get("origin") !== expected)
    throw new HttpError(403, "Nguồn yêu cầu không hợp lệ. Tải lại trang.");
}
export async function readJson(request: Request, max = 65536) {
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new HttpError(415, "Cần Content-Type application/json");
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "Thiếu dữ liệu");
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > max) {
      await reader.cancel();
      throw new HttpError(413, "Dữ liệu quá lớn");
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } catch {
    throw new HttpError(400, "JSON không hợp lệ");
  }
}
export async function handle(fn: () => Promise<Response | unknown>) {
  try {
    const r = await fn();
    return r instanceof Response
      ? r
      : NextResponse.json(r, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    if (e instanceof HttpError)
      return NextResponse.json({ error: e.message }, { status: e.status });
    if (e instanceof ZodError)
      return NextResponse.json(
        {
          error: e.issues
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join("; "),
        },
        { status: 400 },
      );
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")
      return NextResponse.json(
        { error: "Slug hoặc bản ghi đã tồn tại." },
        { status: 409 },
      );
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025")
      return NextResponse.json(
        { error: "Không tìm thấy bản ghi." },
        { status: 404 },
      );
    console.error(
      "Request failed",
      e instanceof Error ? e.name : "UnknownError",
    );
    return NextResponse.json(
      { error: "Không thể xử lý yêu cầu. Kiểm tra database và thử lại." },
      { status: 500 },
    );
  }
}
