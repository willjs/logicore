import { withApi, ApiError, ok } from "@/lib/api";
import { transferCreateSchema } from "@/lib/validations";
import { loadTruck } from "@/lib/services/truck.service";
import { listTransfersByCompany } from "@/lib/services/return.service";
import { serialize } from "@/lib/serialize";

export const GET = withApi(
  async ({ session }) => {
    const transfers = await listTransfersByCompany(session.company.id);
    return ok(serialize(transfers));
  },
  { permissions: ["transfers.view"] },
);

export const POST = withApi(
  async ({ json, session }) => {
    const parsed = transferCreateSchema.safeParse(json);
    if (!parsed.success) {
      throw new ApiError(
        parsed.error.issues[0]?.message ?? "Datos inválidos",
        400,
        "VALIDATION_ERROR",
      );
    }
    const result = await loadTruck(
      parsed.data.truckId,
      session.company.id,
      session.user.id,
      {
        warehouseId: parsed.data.warehouseId,
        items: parsed.data.items,
      },
    );
    return ok(serialize(result), 201);
  },
  { permissions: ["transfers.create"] },
);
