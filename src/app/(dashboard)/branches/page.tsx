import { requirePermission } from "@/lib/auth";
import { BranchesClient } from "./branches-client";

export default async function BranchesPage() {
  await requirePermission("branches.view");
  return <BranchesClient />;
}
