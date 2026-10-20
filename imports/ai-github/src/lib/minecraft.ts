import net from "node:net";
import dns from "node:dns/promises";
import ipaddr from "ipaddr.js";
import { z } from "zod";
export function encodeVarInt(value: number) {
  const out: number[] = [];
  let n = value >>> 0;
  do {
    let b = n & 127;
    n >>>= 7;
    if (n) b |= 128;
    out.push(b);
  } while (n);
  return Buffer.from(out);
}
export function readVarInt(
  buf: Buffer,
  offset = 0,
): { value: number; size: number } | null {
  let value = 0;
  for (let i = 0; i < 5; i++) {
    if (offset + i >= buf.length) return null;
    const b = buf[offset + i];
    value |= (b & 127) << (7 * i);
    if (!(b & 128)) return { value: value >>> 0, size: i + 1 };
  }
  throw new Error("INVALID_VARINT");
}
export function packet(payload: Buffer) {
  return Buffer.concat([encodeVarInt(payload.length), payload]);
}
export function isPublicIP(address: string) {
  try {
    const ip = ipaddr.process(address);
    return ip.range() === "unicast";
  } catch {
    return false;
  }
}
export function flattenMOTD(v: unknown, depth = 0): string {
  if (depth > 12) return "";
  if (typeof v === "string")
    return v.replace(/§[0-9a-fk-orx]/gi, "").slice(0, 500);
  if (Array.isArray(v))
    return v
      .map((x) => flattenMOTD(x, depth + 1))
      .join("")
      .slice(0, 500);
  if (v && typeof v === "object") {
    const o = v as { text?: unknown; extra?: unknown; translate?: unknown };
    return (
      flattenMOTD(o.text ?? o.translate, depth + 1) +
      flattenMOTD(o.extra, depth + 1)
    ).slice(0, 500);
  }
  return "";
}
const responseSchema = z.object({
  version: z.object({ name: z.string().max(200) }),
  players: z.object({
    online: z.number().int().min(0),
    max: z.number().int().min(0),
  }),
  description: z.unknown(),
});
export type PingResult = {
  players: number;
  maxPlayers: number;
  version: string;
  motd: string;
  latency: number | null;
};
export async function pingMinecraft(
  host: string,
  port: number,
  opts: { timeout?: number; allowPrivate?: boolean } = {},
): Promise<PingResult> {
  const timeout = opts.timeout ?? 3500;
  // Resolve once and connect to that exact address, preventing DNS rebinding.
  const addresses = await Promise.race([
    dns.lookup(host, { all: true }),
    new Promise<never>((_, reject) => {
      const t = setTimeout(() => reject(new Error("DNS_TIMEOUT")), timeout);
      t.unref();
    }),
  ]);
  if (
    !addresses.length ||
    (!opts.allowPrivate && addresses.some((a) => !isPublicIP(a.address)))
  )
    throw new Error("PRIVATE_HOST_BLOCKED");
  const target = addresses.find((a) => a.family === 4) ?? addresses[0];
  return new Promise((resolve, reject) => {
    let buffer: Buffer = Buffer.alloc(0),
      result: PingResult | null = null,
      done = false,
      pingAt = 0;
    const nonce = Buffer.alloc(8);
    nonce.writeBigInt64BE(BigInt(Date.now()));
    const socket = net.createConnection({
      host: target.address,
      port,
      family: target.family,
    });
    const finish = (err?: Error) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      socket.destroy();
      if (result) resolve(result);
      else reject(err ?? new Error("CONNECTION_CLOSED"));
    };
    const timer = setTimeout(() => finish(new Error("TIMEOUT")), timeout);
    socket.on("connect", () => {
      const hostname = Buffer.from(host, "utf8"),
        p = Buffer.alloc(2);
      p.writeUInt16BE(port);
      socket.write(
        packet(
          Buffer.concat([
            encodeVarInt(0),
            encodeVarInt(47),
            encodeVarInt(hostname.length),
            hostname,
            p,
            encodeVarInt(1),
          ]),
        ),
      );
      socket.write(packet(encodeVarInt(0)));
    });
    socket.on("error", finish);
    socket.on("end", () => finish());
    socket.on("data", (chunk) => {
      try {
        if (buffer.length + chunk.length > 65536)
          throw new Error("PACKET_TOO_LARGE");
        buffer = Buffer.concat([buffer, chunk]);
        while (buffer.length) {
          const len = readVarInt(buffer);
          if (!len) break;
          if (len.value > 65530 || len.value === 0)
            throw new Error("INVALID_PACKET_SIZE");
          if (buffer.length < len.size + len.value) break;
          const payload = buffer.subarray(len.size, len.size + len.value);
          buffer = buffer.subarray(len.size + len.value);
          const id = readVarInt(payload);
          if (!id) throw new Error("INVALID_PACKET");
          if (id.value === 0 && !result) {
            const n = readVarInt(payload, id.size);
            if (!n || n.value !== payload.length - id.size - n.size)
              throw new Error("INVALID_JSON_SIZE");
            const parsed = responseSchema.parse(
              JSON.parse(payload.subarray(id.size + n.size).toString("utf8")),
            );
            result = {
              players: parsed.players.online,
              maxPlayers: parsed.players.max,
              version: parsed.version.name,
              motd: flattenMOTD(parsed.description),
              latency: null,
            };
            pingAt = performance.now();
            socket.write(packet(Buffer.concat([encodeVarInt(1), nonce])));
          } else if (id.value === 1 && result) {
            if (payload.length !== 9 || !payload.subarray(1).equals(nonce))
              throw new Error("INVALID_PONG");
            result.latency = Math.round(performance.now() - pingAt);
            finish();
          } else throw new Error("UNEXPECTED_PACKET");
        }
      } catch (e) {
        result = null;
        finish(e instanceof Error ? e : new Error("INVALID_RESPONSE"));
      }
    });
  });
}
