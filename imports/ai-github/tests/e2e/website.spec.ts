import { test, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";
test("public routes, metadata and browser console", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  for (const path of [
    "/",
    "/news",
    "/news/hanh-trinh-moi",
    "/game-modes",
    "/game-modes/bedwars",
    "/leaderboards",
    "/store",
    "/store/vip-rank",
    "/vote",
    "/rules",
    "/support",
    "/privacy",
  ]) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page).toHaveTitle(/Minecraft Network/);
  }
  expect(errors).toEqual([]);
});
test("copy IP writes the actual configured address and shows toast", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  await page
    .getByRole("button", { name: "Sao chép IP play.example.com" })
    .last()
    .click();
  await expect(
    page.getByText("Đã sao chép IP máy chủ", { exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    "play.example.com",
  );
});
test("mobile menu opens, closes with Escape and navigates", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await page.getByRole("button", { name: "Mở menu", exact: true }).click();
  await expect(
    page.getByRole("navigation", { name: "Điều hướng di động" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Mở menu", exact: true }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Mở menu", exact: true }).click();
  await page
    .getByRole("navigation", { name: "Điều hướng di động" })
    .getByRole("link", { name: "Tin tức", exact: true })
    .click();
  await expect(page).toHaveURL(/\/news/);
  await expect(
    page.getByRole("navigation", { name: "Điều hướng di động" }),
  ).toHaveCount(0);
});
test("store filters, search, cart edits and browser persistence", async ({
  page,
}) => {
  await page.goto("/store");
  await page.getByRole("button", { name: "Cosmetics", exact: true }).click();
  await expect(page.locator(".product-card")).toHaveCount(1);
  await page.getByLabel("Tìm sản phẩm", { exact: true }).fill("Cyan");
  await page.getByRole("button", { name: "Thêm vào giỏ", exact: true }).click();
  await page.getByRole("button", { name: /Xem giỏ hàng/ }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.locator(".cart-item")).toContainText("Cyan Trail");
  await page
    .getByRole("button", { name: "Tăng Cyan Trail", exact: true })
    .click();
  await expect(page.locator(".qty>span")).toHaveText("2");
  await page.getByRole("button", { name: "Đóng giỏ hàng" }).click();
  await page.reload();
  await page.getByRole("button", { name: /Xem giỏ hàng/ }).click();
  await expect(page.locator(".qty>span")).toHaveText("2");
  await expect(
    page.getByRole("button", { name: "Chưa kết nối thanh toán" }),
  ).toBeDisabled();
});
test("news search and detail routes", async ({ page }) => {
  await page.goto("/news");
  await page.getByLabel("Tìm tin tức", { exact: true }).fill("BedWars");
  await page.getByRole("button", { name: "Tìm kiếm", exact: true }).click();
  await expect(page.locator(".news-card")).toHaveCount(1);
  await page.locator(".news-card h3 a").click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "BedWars",
  );
});
test("leaderboard category and pagination", async ({ page }) => {
  await page.goto("/leaderboards");
  await expect(page.locator(".ranking-row")).toHaveCount(10);
  await page.getByRole("link", { name: "Sau", exact: true }).click();
  await expect(page.locator(".ranking-row")).toHaveCount(2);
  await page.getByRole("link", { name: "Hạ gục", exact: false }).click();
  await expect(page).toHaveURL(/metric=kills/);
  await expect(page.locator(".ranking-row")).toHaveCount(10);
});
test("support form validates and saves a real ticket", async ({ page }) => {
  await page.goto("/support");
  await page.getByRole("button", { name: "Gửi yêu cầu", exact: true }).click();
  await expect(
    page.getByText("Tên Minecraft từ 3–16 ký tự", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Tên Minecraft", { exact: true }).fill("E2EPlayer");
  await page
    .getByLabel("Email liên hệ", { exact: true })
    .fill("test-ticket@example.invalid");
  await page
    .getByLabel("Tiêu đề", { exact: true })
    .fill("Browser test request");
  await page
    .getByLabel("Nội dung", { exact: true })
    .fill(
      "This is an actual browser test ticket stored in the isolated test database.",
    );
  await page.getByRole("button", { name: "Gửi yêu cầu", exact: true }).click();
  await expect(
    page.getByText("Đã nhận yêu cầu của bạn", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".support-success code")).not.toBeEmpty();
});
test("admin authentication, real News CRUD and logout", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/admin\/login/);
  await page
    .getByLabel("Email", { exact: true })
    .fill("e2e-admin@example.invalid");
  await page
    .getByLabel("Mật khẩu", { exact: true })
    .fill(process.env.E2E_TEST_PASSWORD!);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Tổng quan network", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Quản trị", exact: true })
    .getByRole("link", { name: "Tin tức", exact: true })
    .click();
  await page.getByRole("button", { name: "Thêm mới", exact: true }).click();
  const slug = `browser-test-${Date.now()}`;
  await page
    .getByLabel("Slug (chữ thường, số, dấu -)", { exact: true })
    .fill(slug);
  await page
    .getByLabel("Tiêu đề", { exact: true })
    .fill("Browser CRUD article");
  await page
    .getByLabel("Mô tả ngắn", { exact: true })
    .fill("A real end to end test article");
  await page
    .getByLabel("Nội dung bài viết", { exact: true })
    .fill("Saved in the isolated database, then updated and deleted.");
  await page.getByRole("button", { name: "Lưu thay đổi", exact: true }).click();
  const row = page.locator(".record-row").filter({ hasText: slug });
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "Sửa", exact: true }).click();
  await page
    .getByLabel("Tiêu đề", { exact: true })
    .fill("Updated browser article");
  await page.getByRole("button", { name: "Lưu thay đổi", exact: true }).click();
  await expect(row).toContainText("Updated browser article");
  page.once("dialog", (d) => d.accept());
  await row
    .getByRole("button", {
      name: "Xóa bản ghi Updated browser article",
      exact: true,
    })
    .click();
  await expect(row).toHaveCount(0);
  await page.getByRole("button", { name: "Đăng xuất", exact: true }).click();
  await expect(page).toHaveURL(/admin\/login/);
});
test("public status is honest DEMO and admin API rejects anonymous requests", async ({
  request,
}) => {
  const r = await request.get("/api/server-status");
  expect(r.ok()).toBeTruthy();
  expect(await r.json()).toMatchObject({
    state: "demo",
    players: null,
    online: null,
  });
  expect((await request.get("/api/admin/news")).status()).toBe(401);
  expect(
    (
      await request.post("/api/auth/login", {
        data: { email: "bad@example.invalid", password: "bad" },
        headers: { Origin: "https://attacker.test" },
      })
    ).status(),
  ).toBe(403);
});
for (const width of [1920, 1440, 768, 375, 320])
  test(`responsive ${width}px, reduced motion and screenshot`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: width < 768 ? 850 : 1000 });
    for (const path of [
      "/",
      "/news",
      "/leaderboards",
      "/store",
      "/rules",
      "/support",
      "/admin/login",
    ]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
        `No overflow at ${width}px on ${path}`,
      ).toBe(true);
    }
    await page.goto("/");
    await expect(
      page.getByText("DEMO · Chưa cấu hình server", { exact: true }),
    ).toBeVisible();
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 500) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 50));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(500);
    await expect(page.locator(".mode-card").first()).toBeVisible();
    expect(
      await page
        .locator(".mode-card")
        .first()
        .evaluate((el) => Number(getComputedStyle(el.parentElement!).opacity)),
    ).toBeGreaterThan(0.9);
    await page.evaluate(() => {
      (document.activeElement as HTMLElement)?.blur();
    });
    mkdirSync("docs/screenshots", { recursive: true });
    await page.screenshot({
      path: `docs/screenshots/home-${width}.png`,
      fullPage: true,
    });
  });
