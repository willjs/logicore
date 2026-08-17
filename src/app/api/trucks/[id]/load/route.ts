import { withApi, ApiError, ok } from "@/lib/api";
import { truckLoadSchema } from "@/lib/validations";
import { loadTruck } from "@/lib/services/truck.service";
import { serialize } from "@/lib/serialize";

export const POST = withApi(
  async ({ json, session, params }) => {
    const id = Number(params.id);
    if (!Number.isInteger(id)) {
      throw new ApiError("Identificador inválido", 400, "INVALID_ID");
    }

    const parsed = truckLoadSchema.safeParse(json);
    if (!parsed.success) {
      throw new ApiError(
        parsed.error.issues[0]?.message ?? "Datos inválidos",
        400,
        "VALIDATION_ERROR",
      );
    }

    const result = await loadTruck(id, session.company.id, session.user.id, parsed.data);

    return ok(serialize(result), 201);
  },
  { permissions: ["transfers.create"] },
);
