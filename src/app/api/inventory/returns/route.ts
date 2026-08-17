import { withApi, ApiError, ok } from "@/lib/api";
import { returnCreateSchema } from "@/lib/validations";
import { registerReturn, listReturnsByCompany } from "@/lib/services/return.service";
import { serialize } from "@/lib/serialize";

export const GET = withApi(
  async ({ session }) => {
    const returns = await listReturnsByCompany(session.company.id);
    return ok(serialize(returns));
  },
  { permissions: ["returns.view"] },
);

export const POST = withApi(
  async ({ json, session }) => {
    const parsed = returnCreateSchema.safeParse(json);
    if (!parsed.success) {
      throw new ApiError(
        parsed.error.issues[0]?.message ?? "Datos inválidos",
        400,
        "VALIDATION_ERROR",
      );
    }
    const result = await registerReturn(session.company.id, session.user.id, {
      transferId: parsed.data.transferId,
      warehouseId: parsed.data.warehouseId,
      notes: parsed.data.notes ?? null,
      items: parsed.data.items,
    });
    return ok(serialize(result), 201);
  },
  { permissions: ["returns.create"] },
);
