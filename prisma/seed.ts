import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";

const PERMISSIONS = [
  { code: "companies.view", module: "Empresas", description: "Consultar empresas" },
  { code: "companies.create", module: "Empresas", description: "Crear empresas" },
  { code: "companies.edit", module: "Empresas", description: "Editar empresas" },
  { code: "companies.toggle", module: "Empresas", description: "Activar/desactivar empresas" },
  { code: "branches.view", module: "Sedes", description: "Consultar sedes" },
  { code: "branches.create", module: "Sedes", description: "Crear sedes" },
  { code: "branches.edit", module: "Sedes", description: "Editar sedes" },
  { code: "users.view", module: "Usuarios", description: "Consultar usuarios" },
  { code: "users.create", module: "Usuarios", description: "Crear usuarios" },
  { code: "users.edit", module: "Usuarios", description: "Editar usuarios" },
  { code: "users.toggle", module: "Usuarios", description: "Activar/desactivar usuarios" },
  { code: "roles.view", module: "Roles", description: "Consultar roles" },
  { code: "roles.create", module: "Roles", description: "Crear roles" },
  { code: "roles.edit", module: "Roles", description: "Editar roles" },
  { code: "roles.assign", module: "Roles", description: "Asignar permisos a roles" },
  { code: "customers.view", module: "Clientes", description: "Consultar clientes" },
  { code: "customers.create", module: "Clientes", description: "Crear clientes" },
  { code: "customers.edit", module: "Clientes", description: "Editar clientes" },
  { code: "products.view", module: "Productos", description: "Consultar productos" },
  { code: "products.create", module: "Productos", description: "Crear productos" },
  { code: "products.edit", module: "Productos", description: "Editar productos" },
  { code: "inventory.view", module: "Inventario", description: "Consultar inventario" },
  { code: "inventory.create", module: "Inventario", description: "Registrar entradas y salidas" },
  { code: "inventory.adjust", module: "Inventario", description: "Ajustes autorizados de inventario" },
  { code: "warehouses.view", module: "Bodegas", description: "Consultar bodegas" },
  { code: "warehouses.create", module: "Bodegas", description: "Crear bodegas" },
  { code: "warehouses.edit", module: "Bodegas", description: "Editar bodegas" },
  { code: "trucks.view", module: "Camiones", description: "Consultar camiones" },
  { code: "trucks.create", module: "Camiones", description: "Crear camiones" },
  { code: "trucks.edit", module: "Camiones", description: "Editar camiones" },
  { code: "transfers.view", module: "Traslados", description: "Consultar traslados" },
  { code: "transfers.create", module: "Traslados", description: "Realizar traslados" },
  { code: "returns.view", module: "Reintegros", description: "Consultar reintegros" },
  { code: "returns.create", module: "Reintegros", description: "Realizar reintegros" },
  { code: "sales.view", module: "Ventas", description: "Consultar ventas" },
  { code: "sales.create", module: "Ventas", description: "Realizar ventas" },
  { code: "payments.view", module: "Pagos", description: "Consultar pagos" },
  { code: "payments.create", module: "Pagos", description: "Registrar pagos y abonos" },
  { code: "finance.view", module: "Financiero", description: "Consultar información financiera" },
  { code: "reports.view", module: "Reportes", description: "Consultar reportes" },
  { code: "reports.generate", module: "Reportes", description: "Generar reportes" },
  { code: "movements.view", module: "Movimientos", description: "Consultar historial de movimientos" },
  { code: "audit.view", module: "Auditoría", description: "Consultar auditoría" },
  { code: "import.run", module: "Importación", description: "Importar información (Excel)" },
  { code: "export.run", module: "Exportación", description: "Exportar información (Excel)" },
  { code: "dashboard.view", module: "Dashboard", description: "Acceder al panel de inicio" },
];

const ALL_PERMISSION_CODES = PERMISSIONS.map((p) => p.code);

const DEFAULT_ROLES = [
  {
    name: "ADMIN",
    description: "Acceso completo al sistema",
    permissions: ALL_PERMISSION_CODES.filter((c) => c !== "companies.create" && c !== "companies.toggle"),
  },
  {
    name: "SUPERVISOR",
    description: "Controla inventario, traslados y reintegros. Sin información financiera",
    permissions: [
      "dashboard.view",
      "products.view", "products.create", "inventory.view", "inventory.create", "inventory.adjust",
      "warehouses.view", "trucks.view", "transfers.view", "transfers.create",
      "returns.view", "returns.create", "movements.view", "import.run", "export.run",
    ],
  },
  {
    name: "VENDEDOR",
    description: "Realiza ventas y registra pagos desde el camión",
    permissions: [
      "customers.view", "customers.create", "products.view",
      "sales.view", "sales.create", "payments.view", "payments.create",
    ],
  },
  {
    name: "COBRADOR",
    description: "Registra cobros y pagos de clientes",
    permissions: [
      "customers.view", "payments.view", "payments.create",
    ],
  },
  {
    name: "CAMION",
    description: "Encargado del camión. Despacha la mercancía del camión a los vendedores",
    permissions: [
      "trucks.view", "sales.create",
    ],
  },
];

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

  console.log("Sincronizando permisos de roles...");
  for (const roleDef of DEFAULT_ROLES) {
    const roleId = roles[roleDef.name];
    const desiredPerms = await prisma.permission.findMany({
      where: { code: { in: [...roleDef.permissions] } },
    });
    const desiredIds = new Set(desiredPerms.map((p) => p.id));

    const existing = await prisma.rolePermission.findMany({
      where: { roleId },
      select: { permissionId: true },
    });
    const existingIds = new Set(existing.map((e) => e.permissionId));

    const toAdd = desiredPerms
      .filter((p) => !existingIds.has(p.id))
      .map((p) => ({ roleId, permissionId: p.id }));
    if (toAdd.length > 0) {
      await prisma.rolePermission.createMany({ data: toAdd });
      console.log(`  ${roleDef.name}: +${toAdd.length} permisos agregados`);
    }

    const toRemoveIds = existing
      .filter((e) => !desiredIds.has(e.permissionId))
      .map((e) => e.permissionId);
    if (toRemoveIds.length > 0) {
      await prisma.rolePermission.deleteMany({
        where: { roleId, permissionId: { in: toRemoveIds } },
      });
      console.log(`  ${roleDef.name}: -${toRemoveIds.length} permisos removidos`);
    }

    if (toAdd.length === 0 && toRemoveIds.length === 0) {
      console.log(`  ${roleDef.name}: OK`);
    }
  }

  const users: { name: string; email: string; password: string; role: string }[] = [
    { name: "Administrador", email: "admin@erpbod.com", password: "Admin#2026", role: "ADMIN" },
    { name: "Supervisor Demo", email: "supervisor@erpbod.com", password: "Supervisor#2026", role: "SUPERVISOR" },
    { name: "Vendedor Demo", email: "vendedor@erpbod.com", password: "Vendedor#2026", role: "VENDEDOR" },
    { name: "Cobrador Demo", email: "cobrador@erpbod.com", password: "Cobrador#2026", role: "COBRADOR" },
    { name: "Camionero Demo", email: "camion@erpbod.com", password: "Camion#2026", role: "CAMION" },
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
