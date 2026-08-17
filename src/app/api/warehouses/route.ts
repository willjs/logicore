import { withApi, ApiError, ok } from "@/lib/api";
import { warehouseSchema } from "@/lib/validations";
import { auditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { createWarehouse, listWarehousesByCompany } from "@/lib/services/warehouse.service";
import { serialize } from "@/lib/serialize";

export const GET = withApi(
  async ({ session }) => {
    const warehouses = await listWarehousesByCompany(session.company.id);
    return ok(serialize(warehouses));
  },
  { permissions: ["warehouses.view"] },
);

export const POST = withApi(
  async ({ json, session }) => {
    const parsed = warehouseSchema.safeParse(json);
    if (!parsed.success) {
      throw new ApiError(
        parsed.error.issues[0]?.message ?? "Datos inválidos",
        400,
        "VALIDATION_ERROR",
      );
    }

    const warehouse = await createWarehouse(
      session.company.id,
      parsed.data.name,
      parsed.data.location,
      parsed.data.branchId,
    );

    await auditLog(prisma, {
      companyId: session.company.id,
      userId: session.user.id,
      action: "CREATE_WAREHOUSE",
      entity: "WAREHOUSE",
      entityId: warehouse.id,
      details: { name: warehouse.name },
    });

    return ok(serialize(warehouse), 201);
  },
  { permissions: ["warehouses.create"] },
);
