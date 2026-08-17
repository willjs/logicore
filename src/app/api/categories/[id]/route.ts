import { withApi, ApiError, ok } from "@/lib/api";
import { categoryEditSchema } from "@/lib/validations";
import { auditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { updateCategory } from "@/lib/services/catalog.service";
import { serialize } from "@/lib/serialize";

export const PATCH = withApi(
  async ({ json, session, params }) => {
    const id = Number(params.id);
    if (!Number.isInteger(id)) {
      throw new ApiError("Identificador inválido", 400, "INVALID_ID");
    }

    const parsed = categoryEditSchema.safeParse(json);
    if (!parsed.success) {
      throw new ApiError(
        parsed.error.issues[0]?.message ?? "Datos inválidos",
        400,
        "VALIDATION_ERROR",
      );
    }

    const category = await updateCategory(id, session.company.id, parsed.data.name);

    await auditLog(prisma, {
      companyId: session.company.id,
      userId: session.user.id,
      action: "UPDATE_CATEGORY",
      entity: "CATEGORY",
      entityId: id,
      details: { name: category.name },
    });

    return ok(serialize(category));
  },
  { permissions: ["products.edit"] },
);
