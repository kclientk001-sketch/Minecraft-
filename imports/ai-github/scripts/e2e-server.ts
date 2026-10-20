import { spawnSync, spawn } from "node:child_process";
import { writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth-crypto";
const target = resolve("tests/e2e.db");
if (
  process.env.DATABASE_URL !== `file:${target}` ||
  !process.env.E2E_TEST_PASSWORD
)
  throw Error(
    "E2E server requires its isolated database and generated password.",
  );
if (!existsSync(target)) writeFileSync(target, "");
for (const args of [
  ["node_modules/prisma/build/index.js", "migrate", "deploy"],
  ["--import", "tsx", "prisma/seed.ts"],
]) {
  const r = spawnSync(process.execPath, args, {
    stdio: "inherit",
    env: process.env,
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
const db = new PrismaClient();
await db.rateLimit.deleteMany();
const passwordHash = await hashPassword(process.env.E2E_TEST_PASSWORD);
await db.user.upsert({
  where: { email: "e2e-admin@example.invalid" },
  create: {
    name: "Test Administrator",
    role: "ADMIN",
    email: "e2e-admin@example.invalid",
    passwordHash,
  },
  update: { passwordHash, role: "ADMIN", active: true },
});
await db.$disconnect();
const child = spawn(process.execPath, ["scripts/start.mjs"], {
  stdio: "inherit",
  env: process.env,
});
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, () => child.kill(signal));
child.on("exit", (code) => process.exit(code ?? 0));
