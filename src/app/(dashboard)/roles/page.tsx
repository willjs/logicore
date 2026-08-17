import { requirePermission } from "@/lib/auth";
import { RolesClient } from "./roles-client";

export default async function RolesPage() {
  await requirePermission("roles.view");
  return <RolesClient />;
}
