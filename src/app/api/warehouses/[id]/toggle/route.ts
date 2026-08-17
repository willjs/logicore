import { withApi, ApiError, ok } from "@/lib/api";
import { warehouseToggleSchema } from "@/lib/validations";
import { auditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { toggleWarehouse } from "@/lib/services/warehouse.service";
import { serialize } from "@/lib/serialize";

export const POST = withApi(
  async ({ json, session, params }) => {
    const id = Number(params.id);
    if (!Number.isInteger(id)) {
      throw new ApiError("Identificador inválido", 400, "INVALID_ID");
    }

    const parsed = warehouseToggleSchema.safeParse(json);
    if (!parsed.success) {
      throw new ApiError(
        parsed.error.issues[0]?.message ?? "Datos inválidos",
        400,
        "VALIDATION_ERROR",
      );
    }

    const warehouse = await toggleWarehouse(id, session.company.id, parsed.data.active);

    await auditLog(prisma, {
      companyId: session.company.id,
      userId: session.user.id,
      action: "TOGGLE_WAREHOUSE",
      entity: "WAREHOUSE",
      entityId: id,
      details: { active: warehouse.active },
    });

    return ok(serialize(warehouse));
  },
  { permissions: ["warehouses.edit"] },
);
