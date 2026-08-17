// Prisma configuration (Prisma 7)
import { defineConfig } from "prisma/config";

if (!process.env["DATABASE_URL"]) {
  await import("dotenv/config");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
