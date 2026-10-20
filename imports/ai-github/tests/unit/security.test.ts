import { describe, it, expect } from "vitest";
import {
  hashPassword,
  verifyPassword,
  digest,
  secretEqual,
} from "@/lib/auth-crypto";
import {
  configSchema,
  newsSchema,
  supportSchema,
  safeUrl,
} from "@/lib/validation";
import { defaults } from "@/config/site";
import { readJson, checkOrigin } from "@/lib/http";
describe("Security boundaries", () => {
  it("salts password hashes, rejects wrong password and malformed hash", async () => {
    const a = await hashPassword("correct horse battery staple"),
      b = await hashPassword("correct horse battery staple");
    expect(a).not.toBe(b);
    expect(a).not.toContain("correct");
    expect(await verifyPassword("correct horse battery staple", a)).toBe(true);
    expect(await verifyPassword("wrong", a)).toBe(false);
    expect(await verifyPassword("wrong", "bad")).toBe(false);
  });
  it("digests opaque session tokens and compares secrets", () => {
    expect(digest("token")).toHaveLength(64);
    expect(secretEqual("abc", "abc")).toBe(true);
    expect(secretEqual("abc", "abcd")).toBe(false);
  });
  it("rejects executable/credential URLs and arbitrary server ports", () => {
    for (const url of [
      "javascript:alert(1)",
      "//evil.test",
      "http://example.com",
      "https://user:pass@example.com",
    ])
      expect(safeUrl.safeParse(url).success).toBe(false);
    expect(safeUrl.safeParse("https://store.example.com").success).toBe(true);
    expect(
      configSchema.safeParse({ ...defaults, SERVER_PORT: 70000 }).success,
    ).toBe(false);
    expect(
      configSchema.safeParse({ ...defaults, SERVER_IP: "localhost:8080/path" })
        .success,
    ).toBe(false);
  });
  it("accepts HTTPS evidence, blocks honeypot and short support messages", () => {
    const s = {
      type: "SUPPORT",
      player: "TestPlayer",
      email: "test@example.invalid",
      subject: "Need help",
      message: "A sufficiently detailed support request",
      evidenceUrl: "",
      website: "",
    };
    expect(supportSchema.safeParse(s).success).toBe(true);
    expect(supportSchema.safeParse({ ...s, website: "bot" }).success).toBe(
      false,
    );
    expect(supportSchema.safeParse({ ...s, message: "short" }).success).toBe(
      false,
    );
  });
  it("allows local art only in published content", () => {
    expect(
      newsSchema.safeParse({
        slug: "test",
        title: "Title",
        excerpt: "Excerpt",
        body: "Body",
        category: "News",
        image: "https://attacker.test/pixel",
        published: true,
        isDemo: true,
      }).success,
    ).toBe(false);
  });
  it("rejects cross-origin writes", () => {
    expect(() =>
      checkOrigin(
        new Request("http://localhost:3000/api/support", {
          headers: { origin: "https://attacker.test" },
        }),
      ),
    ).toThrow();
    expect(() =>
      checkOrigin(
        new Request("http://localhost:3000/api/support", {
          headers: { origin: "http://localhost:3000" },
        }),
      ),
    ).not.toThrow();
  });
  it("bounds JSON body size and content type", async () => {
    await expect(
      readJson(
        new Request("http://localhost", {
          method: "POST",
          headers: { "Content-Type": "text/plain" },
          body: "{}",
        }),
      ),
    ).rejects.toMatchObject({ status: 415 });
    await expect(
      readJson(
        new Request("http://localhost", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: "x".repeat(1000) }),
        }),
        100,
      ),
    ).rejects.toMatchObject({ status: 413 });
  });
});
