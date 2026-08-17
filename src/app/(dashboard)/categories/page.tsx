import { requirePermission } from "@/lib/auth";
import { CategoriesClient } from "./categories-client";

export default async function CategoriesPage() {
  await requirePermission("products.view");
  return <CategoriesClient />;
}
