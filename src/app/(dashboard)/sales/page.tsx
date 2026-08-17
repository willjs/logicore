import { requirePermission } from "@/lib/auth";
import { SalesClient } from "./sales-client";

export default async function SalesPage() {
  const session = await requirePermission("sales.view");
  return (
    <SalesClient
      canCreate={session.permissions.includes("sales.create")}
      canPay={session.permissions.includes("payments.create")}
      isAdmin={session.role.name === "ADMIN"}
    />
  );
}
