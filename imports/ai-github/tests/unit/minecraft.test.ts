import { describe, it, expect, afterEach, vi } from "vitest";
import net from "node:net";
import {
  encodeVarInt,
  readVarInt,
  packet,
  flattenMOTD,
  isPublicIP,
  pingMinecraft,
} from "@/lib/minecraft";
const servers: net.Server[] = [];
afterEach(async () => {
  await Promise.all(
    servers.splice(0).map((s) => new Promise<void>((r) => s.close(() => r()))),
  );
  vi.restoreAllMocks();
});
async function server(handler: (s: net.Socket) => void) {
  const s = net.createServer(handler);
  servers.push(s);
  await new Promise<void>((r, j) => {
    s.once("error", j);
    s.listen(0, "127.0.0.1", r);
  });
  return (s.address() as net.AddressInfo).port;
}
describe("Minecraft Java status protocol", () => {
  it("roundtrips VarInts and handles fragmentation", () => {
    for (const n of [0, 1, 127, 128, 255, 65535, 2147483647])
      expect(readVarInt(encodeVarInt(n))?.value).toBe(n);
    expect(readVarInt(Buffer.from([128]))).toBeNull();
    expect(() =>
      readVarInt(Buffer.from([255, 255, 255, 255, 255, 255])),
    ).toThrow();
  });
  it("flattens text components and bounds recursion", () => {
    expect(flattenMOTD({ text: "§aHello ", extra: [{ text: "World" }] })).toBe(
      "Hello World",
    );
    expect(flattenMOTD("x".repeat(5000))).toHaveLength(500);
  });
  it("blocks local, private, mapped and metadata addresses", () => {
    for (const ip of [
      "127.0.0.1",
      "10.0.0.1",
      "192.168.1.1",
      "169.254.169.254",
      "::1",
      "::ffff:127.0.0.1",
      "fc00::1",
    ])
      expect(isPublicIP(ip)).toBe(false);
    expect(isPublicIP("1.1.1.1")).toBe(true);
  });
  it("pings a real local protocol fixture, checks handshake and pong latency", async () => {
    let host = "",
      seenRequest = false;
    const port = await server((s) => {
      let buf: Buffer = Buffer.alloc(0),
        handshake = false;
      s.on("data", (chunk) => {
        buf = Buffer.concat([buf, chunk]);
        while (buf.length) {
          const n = readVarInt(buf);
          if (!n || buf.length < n.value + n.size) return;
          const payload = buf.subarray(n.size, n.size + n.value);
          buf = buf.subarray(n.size + n.value);
          if (!handshake) {
            expect(payload[0]).toBe(0);
            const protocol = readVarInt(payload, 1)!;
            const hostLen = readVarInt(payload, 1 + protocol.size)!;
            host = payload
              .subarray(
                1 + protocol.size + hostLen.size,
                1 + protocol.size + hostLen.size + hostLen.value,
              )
              .toString();
            handshake = true;
          } else if (payload[0] === 0) {
            seenRequest = true;
            const json = Buffer.from(
              JSON.stringify({
                version: { name: "Fixture 1.21" },
                players: { online: 12, max: 100 },
                description: { text: "§bFixture" },
              }),
            );
            const response = packet(
              Buffer.concat([
                Buffer.from([0]),
                encodeVarInt(json.length),
                json,
              ]),
            );
            s.write(response.subarray(0, 3));
            setTimeout(() => s.write(response.subarray(3)), 5);
          } else if (payload[0] === 1) s.end(packet(payload));
        }
      });
    });
    const r = await pingMinecraft("127.0.0.1", port, {
      allowPrivate: true,
      timeout: 500,
    });
    expect(host).toBe("127.0.0.1");
    expect(seenRequest).toBe(true);
    expect(r).toMatchObject({
      players: 12,
      maxPlayers: 100,
      version: "Fixture 1.21",
      motd: "Fixture",
    });
    expect(r.latency).toBeGreaterThanOrEqual(0);
  });
  it("enforces SSRF guard even if the host resolves successfully", async () => {
    await expect(pingMinecraft("127.0.0.1", 25565)).rejects.toThrow(
      "PRIVATE_HOST_BLOCKED",
    );
  });
  it("times out a non-responsive server", async () => {
    const sockets: net.Socket[] = [];
    const port = await server((s) => sockets.push(s));
    await expect(
      pingMinecraft("127.0.0.1", port, { allowPrivate: true, timeout: 50 }),
    ).rejects.toThrow("TIMEOUT");
    sockets.forEach((s) => s.destroy());
  });
  it("rejects oversized response frames", async () => {
    const port = await server((s) =>
      s.once("data", () => s.end(encodeVarInt(100000))),
    );
    await expect(
      pingMinecraft("127.0.0.1", port, { allowPrivate: true, timeout: 500 }),
    ).rejects.toThrow("INVALID_PACKET_SIZE");
  });
});
