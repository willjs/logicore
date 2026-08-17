import { withApi, ApiError, ok } from "@/lib/api";
import { warehouseEditSchema } from "@/lib/validations";
import { auditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { updateWarehouse } from "@/lib/services/warehouse.service";
import { serialize } from "@/lib/serialize";

export const PATCH = withApi(
  async ({ json, session, params }) => {
    const id = Number(params.id);
    if (!Number.isInteger(id)) {
      throw new ApiError("Identificador inválido", 400, "INVALID_ID");
    }

    const parsed = warehouseEditSchema.safeParse(json);
    if (!parsed.success) {
      throw new ApiError(
        parsed.error.issues[0]?.message ?? "Datos inválidos",
        400,
        "VALIDATION_ERROR",
      );
    }

    const warehouse = await updateWarehouse(id, session.company.id, parsed.data);

    await auditLog(prisma, {
      companyId: session.company.id,
      userId: session.user.id,
      action: "UPDATE_WAREHOUSE",
      entity: "WAREHOUSE",
      entityId: id,
      details: { name: warehouse.name },
    });

    return ok(serialize(warehouse));
  },
  { permissions: ["warehouses.edit"] },
);
