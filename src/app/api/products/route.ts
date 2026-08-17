import { withApi, ApiError, ok } from "@/lib/api";
import { productSchema } from "@/lib/validations";
import { auditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { createProduct, listProductsByCompany } from "@/lib/services/catalog.service";
import { serialize } from "@/lib/serialize";

export const GET = withApi(
  async ({ session }) => {
    const products = await listProductsByCompany(session.company.id);
    return ok(serialize(products));
  },
  { permissions: ["products.view"] },
);

export const POST = withApi(
  async ({ json, session }) => {
    const parsed = productSchema.safeParse(json);
    if (!parsed.success) {
      throw new ApiError(
        parsed.error.issues[0]?.message ?? "Datos inválidos",
        400,
        "VALIDATION_ERROR",
      );
    }

    const product = await createProduct(session.company.id, parsed.data);

    await auditLog(prisma, {
      companyId: session.company.id,
      userId: session.user.id,
      action: "CREATE_PRODUCT",
      entity: "PRODUCT",
      entityId: product.id,
      details: { name: product.name, serial: product.serial },
    });

    return ok(serialize(product), 201);
  },
  { permissions: ["products.create"] },
);
