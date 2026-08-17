import { requirePermission } from "@/lib/auth";
import { PaymentsClient } from "./payments-client";

export default async function PaymentsPage() {
  const session = await requirePermission("payments.view");
  return (
    <PaymentsClient canPay={session.permissions.includes("payments.create")} />
  );
}
