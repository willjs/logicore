import { requirePermission } from "@/lib/auth";
import { CompaniesClient } from "./companies-client";

export default async function CompaniesPage() {
  await requirePermission("companies.view");
  return <CompaniesClient />;
}
