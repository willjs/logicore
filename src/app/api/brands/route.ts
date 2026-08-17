import { withApi, ApiError, ok } from "@/lib/api";
import { brandSchema } from "@/lib/validations";
import { auditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { createBrand, listBrandsByCompany } from "@/lib/services/catalog.service";
import { serialize } from "@/lib/serialize";

export const GET = withApi(
  async ({ session }) => {
    const brands = await listBrandsByCompany(session.company.id);
    return ok(serialize(brands));
  },
  { permissions: ["products.view"] },
);

export const POST = withApi(
  async ({ json, session }) => {
    const parsed = brandSchema.safeParse(json);
    if (!parsed.success) {
      throw new ApiError(
        parsed.error.issues[0]?.message ?? "Datos inválidos",
        400,
        "VALIDATION_ERROR",
      );
    }

    const brand = await createBrand(session.company.id, parsed.data.name);

    await auditLog(prisma, {
      companyId: session.company.id,
      userId: session.user.id,
      action: "CREATE_BRAND",
      entity: "BRAND",
      entityId: brand.id,
      details: { name: brand.name },
    });

    return ok(serialize(brand), 201);
  },
  { permissions: ["products.create"] },
);
