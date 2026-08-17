import {
  BarChart3,
  Boxes,
  Building2,
  HandCoins,
  LayoutDashboard,
  Package,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Tags,
  Truck,
  Undo2,
  Users,
  Warehouse,
  ArrowLeftRight,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  permission: string | null;
}

export interface NavGroup {
  key: string;
  label: string;
  icon: LucideIcon;
  items: NavItem[];
}

export type NavEntry = NavItem | NavGroup;

function isGroup(entry: NavEntry): entry is NavGroup {
  return "items" in entry;
}

export { isGroup };

export const NAV_ENTRIES: NavEntry[] = [
  { href: "/dashboard", label: "Inicio", icon: LayoutDashboard, permission: null },

  { href: "/customers", label: "Clientes", icon: Users, permission: "customers.view" },

  {
    key: "inventario",
    label: "Inventario",
    icon: Package,
    items: [
      { href: "/products", label: "Productos", icon: Package, permission: "products.view" },
      { href: "/brands", label: "Marcas", icon: Tags, permission: "products.view" },
      { href: "/categories", label: "Categorías", icon: Boxes, permission: "products.view" },
      { href: "/warehouses", label: "Bodegas", icon: Warehouse, permission: "warehouses.view" },
      { href: "/inventory", label: "Stock", icon: Boxes, permission: "inventory.view" },
    ],
  },

  {
    key: "operacion",
    label: "Operación",
    icon: Truck,
    items: [
      { href: "/trucks", label: "Camiones", icon: Truck, permission: "trucks.view" },
      { href: "/transfers", label: "Traslados", icon: ArrowLeftRight, permission: "transfers.view" },
      { href: "/returns", label: "Reintegros", icon: Undo2, permission: "returns.view" },
    ],
  },

  { href: "/sales", label: "Ventas", icon: ShoppingCart, permission: "sales.view" },

  { href: "/payments", label: "Pagos", icon: HandCoins, permission: "payments.view" },

  { href: "/reports", label: "Reportes", icon: BarChart3, permission: "reports.view" },

  {
    key: "configuracion",
    label: "Configuración",
    icon: Settings,
    items: [
      { href: "/companies", label: "Empresa", icon: Building2, permission: "companies.view" },
      { href: "/branches", label: "Sedes", icon: Building2, permission: "branches.view" },
      { href: "/users", label: "Usuarios", icon: Users, permission: "users.view" },
      { href: "/roles", label: "Roles y permisos", icon: ShieldCheck, permission: "roles.view" },
    ],
  },
];
