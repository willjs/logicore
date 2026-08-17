import { requirePermission } from "@/lib/auth";
import { ReportsClient } from "./reports-client";

export default async function ReportsPage() {
  await requirePermission("reports.view");
  return <ReportsClient />;
}
