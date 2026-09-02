import bcrypt from "bcryptjs";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 3306),
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  }),
});

async function main() {
  const companyName = "Empresa Demo S.A.S.";
  const company = await prisma.company.findFirst({ where: { name: companyName } });
  if (!company) {
    console.error("No se encontro la empresa:", companyName);
    return;
  }

  const permCodes = ["trucks.view", "sales.create"];
  console.log("Creando permisos...");
  for (const code of permCodes) {
    await prisma.permission.upsert({
      where: { code },
      update: {},
      create: { code, module: "Camiones", description: code },
    });
  }

  console.log("Creando rol CAMION...");
  const camionRole = await prisma.role.upsert({
    where: { companyId_name: { companyId: company.id, name: "CAMION" } },
    update: { description: "Encargado del camión. Despacha la mercancía del camión a los vendedores" },
    create: {
      companyId: company.id,
      name: "CAMION",
      description: "Encargado del camión. Despacha la mercancía del camión a los vendedores",
    },
  });

  const permRecords = await prisma.permission.findMany({ where: { code: { in: permCodes } } });
  const existing = await prisma.rolePermission.findMany({
    where: { roleId: camionRole.id },
    select: { permissionId: true },
  });
  const existingIds = new Set(existing.map((e) => e.permissionId));
  const toAdd = permRecords
    .filter((p) => !existingIds.has(p.id))
    .map((p) => ({ roleId: camionRole.id, permissionId: p.id }));
  if (toAdd.length > 0) {
    await prisma.rolePermission.createMany({ data: toAdd });
  }

  console.log("Creando usuario camion...");
  const camionEmail = "camion@erpbod.com";
  let user = await prisma.user.findUnique({ where: { email: camionEmail } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        name: "Camionero Demo",
        email: camionEmail,
        passwordHash: bcrypt.hashSync("Camion#2026", 10),
      },
    });
  }
  await prisma.userCompany.upsert({
    where: { userId_companyId: { userId: user.id, companyId: company.id } },
    update: { roleId: camionRole.id },
    create: { userId: user.id, companyId: company.id, roleId: camionRole.id },
  });

  console.log("Listo! Usuario camion@erpbod.com / Camion#2026");
  console.log("Recuerda asignarlo como Conductor de un camión desde Camiones -> editar.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });