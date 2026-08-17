import { requirePermission } from "@/lib/auth";
import { InventoryClient } from "./inventory-client";

export default async function InventoryPage() {
  const session = await requirePermission("inventory.view");
  return (
    <InventoryClient
      canCreate={session.permissions.includes("inventory.create")}
      canAdjust={session.permissions.includes("inventory.adjust")}
      canCreateProduct={
        session.permissions.includes("products.create") &&
        session.permissions.includes("inventory.create")
      }
      canImport={session.permissions.includes("import.run")}
      canExport={session.permissions.includes("export.run")}
    />
  );
}
