// Prisma configuration (Prisma 7)
import { defineConfig } from "prisma/config";
import "dotenv/config";

const dbUrl =
  process.env["DATABASE_URL"] ??
  `mysql://${process.env["DB_USER"] ?? "erpbod"}:${encodeURIComponent(process.env["DB_PASSWORD"] ?? "")}@${process.env["DB_HOST"] ?? "localhost"}:${process.env["DB_PORT"] ?? "3306"}/${process.env["DB_DATABASE"] ?? "erpbod"}`;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: dbUrl,
  },
});
