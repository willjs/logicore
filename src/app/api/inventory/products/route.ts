import { withApi, ApiError, ok } from "@/lib/api";
import { auditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { serialize } from "@/lib/serialize";
import { createProductWithStock } from "@/lib/services/inventory.service";

export const POST = withApi(
  async ({ json, session }) => {
    const body = json ?? {};

    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      throw new ApiError("El nombre del producto es obligatorio", 400, "VALIDATION_ERROR");
    }

    const quantity = Number(body.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new ApiError("La cantidad inicial debe ser mayor a 0", 400, "INVALID_QUANTITY");
    }

    const warehouseId = Number(body.warehouseId);
    if (!Number.isInteger(warehouseId) || warehouseId <= 0) {
      throw new ApiError("Selecciona la bodega de ingreso", 400, "VALIDATION_ERROR");
    }

    const salePrice = body.salePrice === undefined || body.salePrice === null || body.salePrice === ""
      ? 0
      : Number(body.salePrice);
    if (!Number.isFinite(salePrice) || salePrice < 0) {
      throw new ApiError("El valor unitario debe ser un número mayor o igual a 0", 400, "INVALID_PRICE");
    }

    const brandId = body.brandId ? Number(body.brandId) : null;
    const categoryId = body.categoryId ? Number(body.categoryId) : null;

    const result = await createProductWithStock({
      companyId: session.company.id,
      userId: session.user.id,
      name,
      serial: typeof body.serial === "string" && body.serial.trim() ? body.serial.trim() : null,
      salePrice,
      brandId,
      categoryId,
      quantity: Math.floor(quantity),
      warehouseId,
    });

    await auditLog(prisma, {
      companyId: session.company.id,
      userId: session.user.id,
      action: "REGISTER_PRODUCT_ENTRY",
      entity: "STOCK_MOVEMENT",
      entityId: result.movement.id,
      details: { productId: result.product.id, warehouseId, quantity },
    });

    return ok(serialize(result), 201);
  },
  { permissions: ["products.create", "inventory.create"] },
);
