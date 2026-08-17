import { withApi, ApiError, ok } from "@/lib/api";
import { categorySchema } from "@/lib/validations";
import { auditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { createCategory, listCategoriesByCompany } from "@/lib/services/catalog.service";
import { serialize } from "@/lib/serialize";

export const GET = withApi(
  async ({ session }) => {
    const categories = await listCategoriesByCompany(session.company.id);
    return ok(serialize(categories));
  },
  { permissions: ["products.view"] },
);

export const POST = withApi(
  async ({ json, session }) => {
    const parsed = categorySchema.safeParse(json);
    if (!parsed.success) {
      throw new ApiError(
        parsed.error.issues[0]?.message ?? "Datos inválidos",
        400,
        "VALIDATION_ERROR",
      );
    }

    const category = await createCategory(session.company.id, parsed.data.name);

    await auditLog(prisma, {
      companyId: session.company.id,
      userId: session.user.id,
      action: "CREATE_CATEGORY",
      entity: "CATEGORY",
      entityId: category.id,
      details: { name: category.name },
    });

    return ok(serialize(category), 201);
  },
  { permissions: ["products.create"] },
);
