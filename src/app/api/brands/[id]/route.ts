import { withApi, ApiError, ok } from "@/lib/api";
import { brandEditSchema } from "@/lib/validations";
import { auditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { updateBrand } from "@/lib/services/catalog.service";
import { serialize } from "@/lib/serialize";

export const PATCH = withApi(
  async ({ json, session, params }) => {
    const id = Number(params.id);
    if (!Number.isInteger(id)) {
      throw new ApiError("Identificador inválido", 400, "INVALID_ID");
    }

    const parsed = brandEditSchema.safeParse(json);
    if (!parsed.success) {
      throw new ApiError(
        parsed.error.issues[0]?.message ?? "Datos inválidos",
        400,
        "VALIDATION_ERROR",
      );
    }

    const brand = await updateBrand(id, session.company.id, parsed.data.name);

    await auditLog(prisma, {
      companyId: session.company.id,
      userId: session.user.id,
      action: "UPDATE_BRAND",
      entity: "BRAND",
      entityId: id,
      details: { name: brand.name },
    });

    return ok(serialize(brand));
  },
  { permissions: ["products.edit"] },
);
