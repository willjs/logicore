import { requirePermission } from "@/lib/auth";
import { ProductsClient } from "./products-client";

export default async function ProductsPage() {
  await requirePermission("products.view");
  return <ProductsClient />;
}
