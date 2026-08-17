import { withApi, ApiError, ok } from "@/lib/api";
import { truckSchema } from "@/lib/validations";
import { auditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { createTruck, listTrucksByCompany } from "@/lib/services/truck.service";
import { serialize } from "@/lib/serialize";

export const GET = withApi(
  async ({ session }) => {
    const trucks = await listTrucksByCompany(session.company.id);
    return ok(serialize(trucks));
  },
  { permissions: ["trucks.view"] },
);

export const POST = withApi(
  async ({ json, session }) => {
    const parsed = truckSchema.safeParse(json);
    if (!parsed.success) {
      throw new ApiError(
        parsed.error.issues[0]?.message ?? "Datos inválidos",
        400,
        "VALIDATION_ERROR",
      );
    }

    const truck = await createTruck(session.company.id, parsed.data);

    await auditLog(prisma, {
      companyId: session.company.id,
      userId: session.user.id,
      action: "CREATE_TRUCK",
      entity: "TRUCK",
      entityId: truck.id,
      details: { name: truck.name, plate: truck.plate },
    });

    return ok(serialize(truck), 201);
  },
  { permissions: ["trucks.create"] },
);
