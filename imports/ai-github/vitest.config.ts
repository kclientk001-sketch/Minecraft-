import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(
        new URL("./tests/server-only.ts", import.meta.url),
      ),
    },
  },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
    pool: "threads",
    maxWorkers: 1,
    fileParallelism: false,
    globalSetup: ["./tests/setup-db.ts"],
    env: {
      DATABASE_URL: `file:${fileURLToPath(new URL("./tests/unit.db", import.meta.url))}`,
      APP_URL: "http://localhost:3000",
    },
    testTimeout: 10000,
  },
});
