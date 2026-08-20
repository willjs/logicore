export const PERMISSIONS = [
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
] as const;

export const PERMISSION_CODES = PERMISSIONS.map((p) => p.code);

export type PermissionCode = (typeof PERMISSIONS)[number]["code"];

export const ALL_PERMISSION_CODES: PermissionCode[] = [...PERMISSION_CODES];

export const DEFAULT_ROLES = [
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
      "products.view",
      "products.create",
      "inventory.view",
      "inventory.create",
      "inventory.adjust",
      "warehouses.view",
      "trucks.view",
      "transfers.view",
      "transfers.create",
      "returns.view",
      "returns.create",
      "movements.view",
      "import.run",
      "export.run",
    ] as PermissionCode[],
  },
  {
    name: "VENDEDOR",
    description: "Realiza ventas y registra pagos desde el camión",
    permissions: [
      "customers.view",
      "customers.create",
      "products.view",
      "sales.view",
      "sales.create",
      "payments.view",
      "payments.create",
    ] as PermissionCode[],
  },
  {
    name: "COBRADOR",
    description: "Registra cobros y pagos de clientes",
    permissions: [
      "customers.view",
      "payments.view",
      "payments.create",
    ] as PermissionCode[],
  },
] as const;

export const COMPANY_COOKIE = "erpbod_company";
export const TOKEN_COOKIE = "erpbod_token";
