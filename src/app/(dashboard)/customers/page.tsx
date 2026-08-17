import { requirePermission } from "@/lib/auth";
import { CustomersClient } from "./customers-client";

export default async function CustomersPage() {
  await requirePermission("customers.view");
  return <CustomersClient />;
}
