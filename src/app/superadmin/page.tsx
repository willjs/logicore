import { requireSuperAdmin } from "@/lib/auth";
import { SuperAdminClient } from "./superadmin-client";

export default async function SuperAdminPage() {
  await requireSuperAdmin();
  return <SuperAdminClient />;
}
