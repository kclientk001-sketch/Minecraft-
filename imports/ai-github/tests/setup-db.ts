import { writeFileSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
export default function setup() {
  const path = fileURLToPath(new URL("./unit.db", import.meta.url));
  rmSync(path, { force: true });
  writeFileSync(path, "");
  execFileSync(
    process.execPath,
    ["node_modules/prisma/build/index.js", "migrate", "deploy"],
    { env: { ...process.env, DATABASE_URL: `file:${path}` }, stdio: "pipe" },
  );
  return () => {
    rmSync(path, { force: true });
    rmSync(`${path}-journal`, { force: true });
  };
}
