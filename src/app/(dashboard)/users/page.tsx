import { requirePermission } from "@/lib/auth";
import { UsersClient } from "./users-client";

export default async function UsersPage() {
  const session = await requirePermission("users.view");
  return <UsersClient activeCompanyId={session.company.id} />;
}
