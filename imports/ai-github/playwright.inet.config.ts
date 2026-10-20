import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/inet",
  outputDir: "test-results-inet",
  workers: 1,
  timeout: 30000,
  expect: { timeout: 10000 },
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3102",
    browserName: "chromium",
    headless: true,
    contextOptions: { reducedMotion: "reduce" },
  },
  webServer: {
    command: "node scripts/preview-inet.mjs",
    url: "http://localhost:3102",
    timeout: 15000,
    reuseExistingServer: false,
  },
});
