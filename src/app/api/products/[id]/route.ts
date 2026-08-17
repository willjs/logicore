import { withApi, ApiError, ok } from "@/lib/api";
import { productEditSchema } from "@/lib/validations";
import { auditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { updateProduct } from "@/lib/services/catalog.service";
import { serialize } from "@/lib/serialize";

export const PATCH = withApi(
  async ({ json, session, params }) => {
    const id = Number(params.id);
    if (!Number.isInteger(id)) {
      throw new ApiError("Identificador inválido", 400, "INVALID_ID");
    }

    const parsed = productEditSchema.safeParse(json);
    if (!parsed.success) {
      throw new ApiError(
        parsed.error.issues[0]?.message ?? "Datos inválidos",
        400,
        "VALIDATION_ERROR",
      );
    }

    const product = await updateProduct(id, session.company.id, parsed.data);

    await auditLog(prisma, {
      companyId: session.company.id,
      userId: session.user.id,
      action: "UPDATE_PRODUCT",
      entity: "PRODUCT",
      entityId: id,
      details: { name: product.name },
    });

    return ok(serialize(product));
  },
  { permissions: ["products.edit"] },
);
