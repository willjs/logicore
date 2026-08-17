import { requirePermission } from "@/lib/auth";
import { BrandsClient } from "./brands-client";

export default async function BrandsPage() {
  await requirePermission("products.view");
  return <BrandsClient />;
}
