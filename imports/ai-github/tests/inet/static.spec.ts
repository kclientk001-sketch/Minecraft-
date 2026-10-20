import { test, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";
test("static routes, assets, metadata and browser errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  for (const path of [
    "/",
    "/news/",
    "/news/hanh-trinh-moi/",
    "/game-modes/",
    "/game-modes/bedwars/",
    "/leaderboards/",
    "/store/",
    "/store/vip-rank/",
    "/vote/",
    "/rules/",
    "/support/",
    "/admin/",
    "/privacy/",
  ]) {
    const r = await page.goto(path);
    expect(r?.status(), path).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }
  expect(errors).toEqual([]);
});
test("static support and admin honestly show disconnected backend", async ({
  page,
}) => {
  await page.goto("/support/?type=APPEAL");
  await expect(
    page.getByRole("button", { name: "Backend chưa kết nối", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("combobox", { name: "Loại yêu cầu" }),
  ).toHaveValue("APPEAL");
  await page.goto("/admin/");
  await expect(
    page.getByText(
      "Chưa cấu hình URL dashboard. Không có đăng nhập giả trên bản tĩnh.",
      { exact: true },
    ),
  ).toBeVisible();
  await page.goto("/");
  await expect(
    page.getByText("DEMO · Chưa cấu hình server", { exact: true }),
  ).toBeVisible();
});
test("static news search and leaderboard client pagination", async ({
  page,
}) => {
  await page.goto("/news/");
  await page.getByLabel("Tìm bài viết", { exact: true }).fill("BedWars");
  await expect(page.locator(".news-card")).toHaveCount(1);
  await page.goto("/leaderboards/");
  await expect(page.locator(".ranking-row")).toHaveCount(10);
  await page.getByRole("button", { name: "Sau", exact: true }).click();
  await expect(page.locator(".ranking-row")).toHaveCount(2);
  await page.getByRole("button", { name: "Hạ gục", exact: true }).click();
  await expect(page.locator(".ranking-row")).toHaveCount(10);
});
test("static catalog filters and persistent cart", async ({ page }) => {
  await page.goto("/store/");
  await page.getByRole("button", { name: "Pets", exact: true }).click();
  await expect(page.locator(".product-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Thêm vào giỏ", exact: true }).click();
  await page.getByRole("button", { name: /Xem giỏ hàng/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.locator(".cart-item")).toContainText("Fox Companion");
  await expect(
    page.getByRole("button", { name: "Chưa kết nối thanh toán", exact: true }),
  ).toBeDisabled();
});
for (const width of [1440, 375])
  test(`static responsive ${width}px and screenshot`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const path of [
      "/",
      "/news/",
      "/leaderboards/",
      "/store/",
      "/support/",
      "/rules/",
    ]) {
      await page.goto(path);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        path,
      ).toBe(true);
    }
    await page.goto("/");
    await expect(page.locator(".mode-card").first()).toBeVisible();
    expect(
      await page
        .locator(".mode-card")
        .first()
        .evaluate((e) => Number(getComputedStyle(e.parentElement!).opacity)),
    ).toBeGreaterThan(0.9);
    mkdirSync("docs/screenshots", { recursive: true });
    await page.screenshot({
      path: `docs/screenshots/inet-${width}.png`,
      fullPage: true,
    });
    await page.screenshot({
      path: `docs/screenshots/inet-preview-${width}.png`,
      fullPage: false,
    });
  });
