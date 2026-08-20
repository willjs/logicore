import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";

function createAdapter() {
  const { PrismaMariaDb } = require("@prisma/adapter-mariadb");
  return new PrismaMariaDb({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 3306),
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });
}

const prisma = new PrismaClient({ adapter: createAdapter() } as any);

async function main() {
  const companyName = "Empresa Demo S.A.S.";
  const company = await prisma.company.findFirst({ where: { name: companyName } });
  if (!company) {
    console.error("No se encontro la empresa:", companyName);
    return;
  }

  console.log("Creando permiso dashboard.view...");
  await prisma.permission.upsert({
    where: { code: "dashboard.view" },
    update: {},
    create: { code: "dashboard.view", module: "Dashboard", description: "Acceder al panel de inicio" },
  });

  console.log("Creando rol COBRADOR...");
  const cobradorRole = await prisma.role.upsert({
    where: { companyId_name: { companyId: company.id, name: "COBRADOR" } },
    update: { description: "Registra cobros y pagos de clientes" },
    create: { companyId: company.id, name: "COBRADOR", description: "Registra cobros y pagos de clientes" },
  });

  const cobradorPerms = ["customers.view", "payments.view", "payments.create"];
  const permRecords = await prisma.permission.findMany({ where: { code: { in: cobradorPerms } } });
  const existing = await prisma.rolePermission.findMany({ where: { roleId: cobradorRole.id }, select: { permissionId: true } });
  const existingIds = new Set(existing.map((e) => e.permissionId));
  const toAdd = permRecords.filter((p) => !existingIds.has(p.id)).map((p) => ({ roleId: cobradorRole.id, permissionId: p.id }));
  if (toAdd.length > 0) {
    await prisma.rolePermission.createMany({ data: toAdd });
  }

  console.log("Agregando dashboard.view a SUPERVISOR...");
  const supervisorRole = await prisma.role.findFirst({ where: { companyId: company.id, name: "SUPERVISOR" } });
  if (supervisorRole) {
    const dashPerm = await prisma.permission.findUnique({ where: { code: "dashboard.view" } });
    if (dashPerm) {
      const exists = await prisma.rolePermission.findFirst({ where: { roleId: supervisorRole.id, permissionId: dashPerm.id } });
      if (!exists) {
        await prisma.rolePermission.create({ data: { roleId: supervisorRole.id, permissionId: dashPerm.id } });
      }
    }
  }

  console.log("Creando usuario cobrador...");
  const cobradorEmail = "cobrador@erpbod.com";
  let user = await prisma.user.findUnique({ where: { email: cobradorEmail } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        name: "Cobrador Demo",
        email: cobradorEmail,
        passwordHash: bcrypt.hashSync("Cobrador#2026", 10),
      },
    });
  }
  await prisma.userCompany.upsert({
    where: { userId_companyId: { userId: user.id, companyId: company.id } },
    update: { roleId: cobradorRole.id },
    create: { userId: user.id, companyId: company.id, roleId: cobradorRole.id },
  });

  console.log("Listo! Usuario cobrador@erpbod.com / Cobrador#2026");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
