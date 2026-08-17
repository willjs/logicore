import bcrypt from "bcryptjs";

import { prisma } from "../src/lib/db";
import { DEFAULT_ROLES, PERMISSIONS } from "../src/lib/constants";

async function main() {
  console.log("Creando permisos...");
  for (const perm of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: { module: perm.module, description: perm.description },
      create: { code: perm.code, module: perm.module, description: perm.description },
    });
  }

  const companyName = "Empresa Demo S.A.S.";
  console.log(`Creando empresa: ${companyName}`);
  let company = await prisma.company.findFirst({ where: { name: companyName } });
  if (!company) {
    company = await prisma.company.create({
      data: { name: companyName, nit: "900000000-1", email: "demo@erpbod.com" },
    });
  }

  console.log("Creando roles...");
  const roles: Record<string, number> = {};
  for (const roleDef of DEFAULT_ROLES) {
    const role = await prisma.role.upsert({
      where: { companyId_name: { companyId: company.id, name: roleDef.name } },
      update: { description: roleDef.description },
      create: { companyId: company.id, name: roleDef.name, description: roleDef.description },
    });
    roles[roleDef.name] = role.id;
  }

  console.log("Asignando permisos a roles...");
  for (const roleDef of DEFAULT_ROLES) {
    const roleId = roles[roleDef.name];
    const existing = await prisma.rolePermission.findMany({ where: { roleId }, select: { permissionId: true } });
    const existingIds = new Set(existing.map((e) => e.permissionId));
    const perms = await prisma.permission.findMany({
      where: { code: { in: [...roleDef.permissions] } },
    });
    const toAdd = perms.filter((p) => !existingIds.has(p.id)).map((p) => ({ roleId, permissionId: p.id }));
    if (toAdd.length > 0) {
      await prisma.rolePermission.createMany({ data: toAdd });
    }
  }

  const users: { name: string; email: string; password: string; role: string }[] = [
    { name: "Administrador", email: "admin@erpbod.com", password: "Admin#2026", role: "ADMIN" },
    { name: "Supervisor Demo", email: "supervisor@erpbod.com", password: "Supervisor#2026", role: "SUPERVISOR" },
    { name: "Vendedor Demo", email: "vendedor@erpbod.com", password: "Vendedor#2026", role: "VENDEDOR" },
  ];

  console.log("Creando usuarios...");
  for (const u of users) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        name: u.name,
        email: u.email,
        passwordHash: bcrypt.hashSync(u.password, 10),
      },
    });
    const roleId = roles[u.role];
    await prisma.userCompany.upsert({
      where: { userId_companyId: { userId: user.id, companyId: company.id } },
      update: { roleId },
      create: { userId: user.id, companyId: company.id, roleId },
    });
    console.log(`  Usuario ${u.email} -> rol ${u.role}`);
  }

  console.log("Seed completado.");
  console.log("Credenciales:");
  console.log("  superadmin@erpbod.com / SuperAdmin#2026 (Superadmin)");
  console.log("  admin@erpbod.com / Admin#2026");
  console.log("  supervisor@erpbod.com / Supervisor#2026");
  console.log("  vendedor@erpbod.com / Vendedor#2026");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("Error en seed:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
