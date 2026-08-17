import { requirePermission } from "@/lib/auth";
import { TransfersClient } from "./transfers-client";

export default async function TransfersPage() {
  const session = await requirePermission("transfers.view");
  return (
    <TransfersClient
      canCreate={session.permissions.includes("transfers.create")}
    />
  );
}
