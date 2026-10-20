import "server-only";
import { pingMinecraft } from "@/lib/minecraft";
import type { SiteConfig, Status } from "@/types";
import { placeholderUrl } from "@/lib/utils";
let cached: { key: string; expires: number; value: Status } | undefined;
const pending = new Map<string, Promise<Status>>();
export async function getStatus(config: SiteConfig): Promise<Status> {
  const key = `${config.SERVER_IP}:${config.SERVER_PORT}:${config.DEMO_MODE}`;
  if (cached?.key === key && cached.expires > Date.now()) return cached.value;
  if (pending.has(key)) return pending.get(key)!;
  const job = (async () => {
    const empty = {
      online: null,
      players: null,
      maxPlayers: null,
      version: null,
      motd: "",
      latency: null,
      updatedAt: new Date().toISOString(),
    };
    if (config.DEMO_MODE || placeholderUrl(config.SERVER_IP))
      return {
        state: "demo",
        demo: true,
        ...empty,
        motd: "Cấu hình IP thật và tắt DEMO để kiểm tra máy chủ.",
      } as Status;
    let error: unknown;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return {
          state: "online",
          demo: false,
          online: true,
          ...(await pingMinecraft(config.SERVER_IP, config.SERVER_PORT, {
            allowPrivate: process.env.ALLOW_PRIVATE_MC_HOST === "true",
          })),
          updatedAt: new Date().toISOString(),
        } as Status;
      } catch (e) {
        error = e;
        if (
          e instanceof Error &&
          /PRIVATE_HOST_BLOCKED|INVALID_|ENOTFOUND/.test(e.message)
        )
          break;
      }
    }
    const message = error instanceof Error ? error.message : "UNKNOWN";
    const offline = /ECONNREFUSED/.test(message);
    return {
      ...empty,
      state: offline ? "offline" : "error",
      demo: false,
      online: false,
      error: offline
        ? "Máy chủ từ chối kết nối."
        : /PRIVATE_HOST_BLOCKED/.test(message)
          ? "Địa chỉ nội bộ bị chặn. Kiểm tra cấu hình bảo mật."
          : "Không xác minh được trạng thái. Tạm xem là offline; kiểm tra DNS, firewall hoặc timeout.",
    } as Status;
  })();
  pending.set(key, job);
  try {
    const value = await job;
    cached = { key, expires: Date.now() + 45000, value };
    return value;
  } finally {
    pending.delete(key);
  }
}
