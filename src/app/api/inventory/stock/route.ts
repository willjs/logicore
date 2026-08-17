import { withApi, ok } from "@/lib/api";
import { listStockByCompany } from "@/lib/services/inventory.service";
import { serialize } from "@/lib/serialize";

export const GET = withApi(
  async ({ session, req }) => {
    const rawWarehouseId = req.nextUrl.searchParams.get("warehouseId");
    const warehouseId = rawWarehouseId ? Number(rawWarehouseId) : undefined;
    const stock = await listStockByCompany(
      session.company.id,
      Number.isInteger(warehouseId) ? warehouseId : undefined,
    );
    return ok(serialize(stock));
  },
  { permissions: ["inventory.view"] },
);
