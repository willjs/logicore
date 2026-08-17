import { withApi, ApiError, ok } from "@/lib/api";
import { truckToggleSchema } from "@/lib/validations";
import { auditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { toggleTruck } from "@/lib/services/truck.service";
import { serialize } from "@/lib/serialize";

export const POST = withApi(
  async ({ json, session, params }) => {
    const id = Number(params.id);
    if (!Number.isInteger(id)) {
      throw new ApiError("Identificador inválido", 400, "INVALID_ID");
    }

    const parsed = truckToggleSchema.safeParse(json);
    if (!parsed.success) {
      throw new ApiError(
        parsed.error.issues[0]?.message ?? "Datos inválidos",
        400,
        "VALIDATION_ERROR",
      );
    }

    const truck = await toggleTruck(id, session.company.id, parsed.data.active);

    await auditLog(prisma, {
      companyId: session.company.id,
      userId: session.user.id,
      action: "TOGGLE_TRUCK",
      entity: "TRUCK",
      entityId: id,
      details: { active: truck.active },
    });

    return ok(serialize(truck));
  },
  { permissions: ["trucks.edit"] },
);
