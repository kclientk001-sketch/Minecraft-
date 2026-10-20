import { defineConfig } from "@playwright/test";
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
process.env.E2E_TEST_PASSWORD ||= randomBytes(24).toString("base64url");
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  expect: { timeout: 10000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:3100",
    headless: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    contextOptions: { reducedMotion: "reduce" },
  },
  webServer: {
    command: "node --import tsx scripts/e2e-server.ts",
    url: "http://localhost:3100/api/health",
    reuseExistingServer: false,
    timeout: 90000,
    env: {
      ...process.env,
      DATABASE_URL: `file:${resolve("tests/e2e.db")}`,
      APP_URL: "http://localhost:3100",
      E2E_TEST_PASSWORD: process.env.E2E_TEST_PASSWORD!,
      PORT: "3100",
    },
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});
