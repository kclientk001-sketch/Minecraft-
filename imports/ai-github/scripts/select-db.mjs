import "dotenv/config";
import {
  readFileSync,
  writeFileSync,
  existsSync,
  cpSync,
  rmSync,
} from "node:fs";
const schema = "prisma/schema.prisma";
const text = readFileSync(schema, "utf8");
const current = text.includes('provider = "postgresql"')
  ? "postgres"
  : "sqlite";
const selected = process.argv[2] || process.env.DB_PROVIDER || current;
if (!["sqlite", "postgres"].includes(selected))
  throw Error("DB_PROVIDER must be sqlite or postgres.");
if (selected !== current) {
  // Save the current provider's source and migration history before selecting the other provider.
  writeFileSync(`prisma/schema.${current}.prisma`, text);
  if (existsSync("prisma/migrations")) {
    rmSync(`prisma/migrations-${current}`, { recursive: true, force: true });
    cpSync("prisma/migrations", `prisma/migrations-${current}`, {
      recursive: true,
    });
  }
  writeFileSync(schema, readFileSync(`prisma/schema.${selected}.prisma`));
  rmSync("prisma/migrations", { recursive: true, force: true });
  cpSync(`prisma/migrations-${selected}`, "prisma/migrations", {
    recursive: true,
  });
  console.log(
    `Selected ${selected} schema and migrations. No database was modified.`,
  );
}
