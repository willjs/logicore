import { requirePermission } from "@/lib/auth";
import { WarehousesClient } from "./warehouses-client";

export default async function WarehousesPage() {
  await requirePermission("warehouses.view");
  return <WarehousesClient />;
}
