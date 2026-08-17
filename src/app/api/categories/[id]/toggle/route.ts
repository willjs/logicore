import { withApi, ApiError, ok } from "@/lib/api";
import { productToggleSchema } from "@/lib/validations";
import { auditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { toggleCategory } from "@/lib/services/catalog.service";
import { serialize } from "@/lib/serialize";

export const POST = withApi(
  async ({ json, session, params }) => {
    const id = Number(params.id);
    if (!Number.isInteger(id)) {
      throw new ApiError("Identificador inválido", 400, "INVALID_ID");
    }

    const parsed = productToggleSchema.safeParse(json);
    if (!parsed.success) {
      throw new ApiError(
        parsed.error.issues[0]?.message ?? "Datos inválidos",
        400,
        "VALIDATION_ERROR",
      );
    }

    const category = await toggleCategory(id, session.company.id, parsed.data.active);

    await auditLog(prisma, {
      companyId: session.company.id,
      userId: session.user.id,
      action: "TOGGLE_CATEGORY",
      entity: "CATEGORY",
      entityId: id,
      details: { active: category.active },
    });

    return ok(serialize(category));
  },
  { permissions: ["products.edit"] },
);
