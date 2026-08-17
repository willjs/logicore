import { withApi, ApiError, ok } from "@/lib/api";
import { truckEditSchema } from "@/lib/validations";
import { auditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { updateTruck } from "@/lib/services/truck.service";
import { serialize } from "@/lib/serialize";

export const PATCH = withApi(
  async ({ json, session, params }) => {
    const id = Number(params.id);
    if (!Number.isInteger(id)) {
      throw new ApiError("Identificador inválido", 400, "INVALID_ID");
    }

    const parsed = truckEditSchema.safeParse(json);
    if (!parsed.success) {
      throw new ApiError(
        parsed.error.issues[0]?.message ?? "Datos inválidos",
        400,
        "VALIDATION_ERROR",
      );
    }

    const truck = await updateTruck(id, session.company.id, parsed.data);

    await auditLog(prisma, {
      companyId: session.company.id,
      userId: session.user.id,
      action: "UPDATE_TRUCK",
      entity: "TRUCK",
      entityId: id,
      details: { name: truck.name },
    });

    return ok(serialize(truck));
  },
  { permissions: ["trucks.edit"] },
);
