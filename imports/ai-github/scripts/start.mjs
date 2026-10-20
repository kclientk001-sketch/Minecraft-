import "dotenv/config";
import { resolve, isAbsolute } from "node:path";
import { existsSync, cpSync, mkdirSync } from "node:fs";
import { spawn } from "node:child_process";
// Standalone changes cwd; preserve the datasource path relative to the source schema.
const databaseUrl = process.env.DATABASE_URL;
if (databaseUrl?.startsWith("file:")) {
  const [filePath, ...query] = databaseUrl.slice(5).split("?");
  if (!isAbsolute(filePath))
    process.env.DATABASE_URL = `file:${resolve("prisma", filePath)}${query.length ? "?" + query.join("?") : ""}`;
}
const root = ".next/standalone";
if (!existsSync(`${root}/server.js`))
  throw Error("Run npm run build before npm start.");
mkdirSync(`${root}/.next`, { recursive: true });
if (existsSync("public"))
  cpSync("public", `${root}/public`, { recursive: true });
cpSync(".next/static", `${root}/.next/static`, { recursive: true });
const child = spawn(process.execPath, [`${root}/server.js`], {
  stdio: "inherit",
  env: {
    ...process.env,
    HOSTNAME: process.env.HOSTNAME_OVERRIDE || "0.0.0.0",
    PORT: process.env.PORT || "3000",
  },
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
child.on("exit", (code) => process.exit(code ?? 0));
