import { spawnSync, spawn } from "node:child_process";
for (const args of [
  ["scripts/init-db.mjs"],
  ["node_modules/prisma/build/index.js", "migrate", "deploy"],
  ...(process.env.SEED_DEMO_ON_BOOT === "true"
    ? [["--import", "tsx", "prisma/seed.ts"]]
    : []),
]) {
  const r = spawnSync(process.execPath, args, {
    stdio: "inherit",
    env: process.env,
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
const child = spawn(process.execPath, ["scripts/start.mjs"], {
  stdio: "inherit",
  env: process.env,
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
child.on("exit", (code) => process.exit(code ?? 0));
