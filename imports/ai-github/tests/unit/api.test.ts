import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth-crypto";
import { createSession, COOKIE } from "@/lib/auth";
import { limit } from "@/lib/rate-limit";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as logout } from "@/app/api/auth/logout/route";
import {
  GET as adminGet,
  POST as adminCreate,
} from "@/app/api/admin/[resource]/route";
import {
  PATCH as adminUpdate,
  DELETE as adminDelete,
} from "@/app/api/admin/[resource]/[id]/route";
import { POST as support } from "@/app/api/support/route";
import { POST as ingest } from "@/app/api/stats/ingest/route";
import { getStatus } from "@/lib/server-status";
import { defaults } from "@/config/site";
const origin = "http://localhost:3000";
function req(
  path: string,
  body?: unknown,
  token?: string,
  method = body === undefined ? "GET" : "POST",
) {
  return new NextRequest(origin + path, {
    method,
    headers: {
      origin,
      "Content-Type": "application/json",
      ...(token ? { cookie: `${COOKIE}=${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}
async function user(role = "ADMIN") {
  const u = await db.user.create({
    data: {
      email: `${role.toLowerCase()}@example.invalid`,
      name: role,
      role,
      passwordHash: await hashPassword("long test password fixture"),
    },
  });
  return { u, token: await createSession(u.id) };
}
const ctx = (resource: string, id?: string) => ({
  params: Promise.resolve({ resource, id: id || "" }),
});
beforeEach(async () => {
  await db.session.deleteMany();
  await db.user.deleteMany();
  await db.rateLimit.deleteMany();
  await db.news.deleteMany();
  await db.supportTicket.deleteMany();
  await db.leaderboardEntry.deleteMany();
});
afterAll(() => db.$disconnect());
describe("Real database and route handlers", () => {
  it("login creates opaque HttpOnly cookie and logout revokes it", async () => {
    await user();
    const bad = await login(
      req("/api/auth/login", {
        email: "admin@example.invalid",
        password: "wrong",
      }),
    );
    expect(bad.status).toBe(401);
    const r = await login(
      req("/api/auth/login", {
        email: "admin@example.invalid",
        password: "long test password fixture",
      }),
    );
    expect(r.status).toBe(200);
    const cookie = r.headers.get("set-cookie")!;
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=strict");
    const token = cookie.split(";")[0].split("=")[1];
    expect(
      (await adminGet(req("/api/admin/news", undefined, token), ctx("news")))
        .status,
    ).toBe(200);
    expect((await logout(req("/api/auth/logout", {}, token))).status).toBe(200);
    expect(
      (await adminGet(req("/api/admin/news", undefined, token), ctx("news")))
        .status,
    ).toBe(401);
  });
  it("rejects anonymous access, expired sessions and editor configuration writes", async () => {
    expect((await adminGet(req("/api/admin/news"), ctx("news"))).status).toBe(
      401,
    );
    const { token, u } = await user("EDITOR");
    expect(
      (
        await adminCreate(
          req("/api/admin/settings", defaults, token),
          ctx("settings"),
        )
      ).status,
    ).toBe(403);
    await db.session.updateMany({
      where: { userId: u.id },
      data: { expiresAt: new Date(0) },
    });
    expect(
      (await adminGet(req("/api/admin/news", undefined, token), ctx("news")))
        .status,
    ).toBe(401);
  });
  it("runs News create/read/update/delete with backend validation", async () => {
    const { token } = await user();
    const data = {
      slug: "test-article",
      title: "Test article",
      excerpt: "Testing actual storage",
      body: "Persistent content",
      category: "Tests",
      image: "/images/hub.svg",
      published: true,
      isDemo: true,
    };
    const create = await adminCreate(
      req("/api/admin/news", data, token),
      ctx("news"),
    );
    expect(create.status).toBe(200);
    const row = await create.json();
    expect(await db.news.count()).toBe(1);
    const update = await adminUpdate(
      req(
        `/api/admin/news/${row.id}`,
        { ...data, title: "Updated article" },
        token,
        "PATCH",
      ),
      ctx("news", row.id),
    );
    expect(update.status).toBe(200);
    expect((await db.news.findUnique({ where: { id: row.id } }))?.title).toBe(
      "Updated article",
    );
    const invalid = await adminCreate(
      req("/api/admin/news", { ...data, slug: "INVALID SLUG" }, token),
      ctx("news"),
    );
    expect(invalid.status).toBe(400);
    const del = await adminDelete(
      req(`/api/admin/news/${row.id}`, undefined, token, "DELETE"),
      ctx("news", row.id),
    );
    expect(del.status).toBe(200);
    expect(await db.news.count()).toBe(0);
  });
  it("persists support tickets and rejects spam honeypot", async () => {
    const data = {
      type: "REPORT",
      player: "TestPlayer",
      email: "report@example.invalid",
      subject: "Player report",
      message: "Please review this sufficiently detailed report.",
      evidenceUrl: "",
      website: "",
    };
    expect(
      (await support(req("/api/support", { ...data, website: "spam" }))).status,
    ).toBe(400);
    const r = await support(req("/api/support", data));
    expect(r.status).toBe(200);
    const { id } = await r.json();
    expect(
      (await db.supportTicket.findUnique({ where: { id } }))?.subject,
    ).toBe(data.subject);
  });
  it("applies persistent rate limits", async () => {
    await limit("a-test-key", 2, 60000);
    await limit("a-test-key", 2, 60000);
    await expect(limit("a-test-key", 2, 60000)).rejects.toMatchObject({
      status: 429,
    });
  });
  it("returns DEMO without invented online counts for placeholder host", async () => {
    const status = await getStatus({
      ...defaults,
      SERVER_IP: "play.example.com",
      DEMO_MODE: false,
    });
    expect(status.state).toBe("demo");
    expect(status.players).toBeNull();
    expect(status.online).toBeNull();
  });
  it("authenticates statistics ingestion and replaces DEMO for that metric", async () => {
    process.env.STATS_INGEST_TOKEN =
      "test-only-ingest-secret-at-least-32-characters";
    await db.leaderboardEntry.create({
      data: {
        metric: "kills",
        player: "DemoPlayer",
        value: 42,
        unit: "lượt",
        isDemo: true,
      },
    });
    const data = {
      entries: [
        {
          metric: "kills",
          player: "RealPlayer",
          value: 7,
          unit: "lượt",
          source: "Local Minecraft fixture",
        },
      ],
    };
    expect((await ingest(req("/api/stats/ingest", data))).status).toBe(401);
    const request = new Request(origin + "/api/stats/ingest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${process.env.STATS_INGEST_TOKEN}`,
      },
      body: JSON.stringify(data),
    });
    expect((await ingest(request)).status).toBe(200);
    const rows = await db.leaderboardEntry.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      player: "RealPlayer",
      value: 7,
      isDemo: false,
    });
    delete process.env.STATS_INGEST_TOKEN;
  });
});
