import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../generated/prisma/client";

function createAdapter() {
  return new PrismaMariaDb({
    host: process.env.DB_HOST ?? "localhost",
    port: Number(process.env.DB_PORT ?? 3306),
    database: process.env.DB_DATABASE ?? "erpbod",
    user: process.env.DB_USER ?? "erpbod",
    password: process.env.DB_PASSWORD ?? "",
  });
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? new PrismaClient({ adapter: createAdapter() });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
