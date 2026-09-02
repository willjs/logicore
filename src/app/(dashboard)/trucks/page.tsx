import { requirePermission } from "@/lib/auth";
import { TrucksClient } from "./trucks-client";

export default async function TrucksPage() {
  const session = await requirePermission("trucks.view");
  return (
    <TrucksClient
      canCreate={session.permissions.includes("trucks.create")}
      canLoad={session.permissions.includes("transfers.create")}
      canAssign={session.permissions.includes("sales.create")}
    />
  );
}
