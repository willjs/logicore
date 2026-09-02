import { requirePermission } from "@/lib/auth";
import { SalesClient } from "./sales-client";
import { VendorSalesClient } from "./vendor-sales-client";

export default async function SalesPage() {
  const session = await requirePermission("sales.view");
  if (/vendedor/i.test(session.role.name)) {
    return (
      <VendorSalesClient
        canCreate={session.permissions.includes("sales.create")}
        canPay={session.permissions.includes("payments.create")}
        vendorName={session.user.name}
      />
    );
  }
  return (
    <SalesClient
      canCreate={session.permissions.includes("sales.create")}
      canPay={session.permissions.includes("payments.create")}
      isAdmin={session.role.name === "ADMIN"}
    />
  );
}
