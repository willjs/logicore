import { requirePermission } from "@/lib/auth";
import { TrucksClient } from "./trucks-client";
import { TruckProfileClient } from "./truck-profile-client";

export default async function TrucksPage() {
  const session = await requirePermission("trucks.view");
  if (/camion|conductor/i.test(session.role.name)) {
    return (
      <TruckProfileClient
        canAssign={session.permissions.includes("sales.create")}
        operatorName={session.user.name}
      />
    );
  }
  return (
    <TrucksClient
      canCreate={session.permissions.includes("trucks.create")}
      canLoad={session.permissions.includes("transfers.create")}
      canAssign={session.permissions.includes("sales.create")}
    />
  );
}
