import { withApi, ApiError, ok } from "@/lib/api";
import { movementSchema } from "@/lib/validations";
import { listMovements, registerMovement } from "@/lib/services/inventory.service";
import { serialize } from "@/lib/serialize";

export const GET = withApi(
  async ({ session, req }) => {
    const rawProductId = req.nextUrl.searchParams.get("productId");
    const rawWarehouseId = req.nextUrl.searchParams.get("warehouseId");
    const productId = rawProductId ? Number(rawProductId) : undefined;
    const warehouseId = rawWarehouseId ? Number(rawWarehouseId) : undefined;

    const movements = await listMovements(session.company.id, {
      productId: Number.isInteger(productId) ? productId : undefined,
      warehouseId: Number.isInteger(warehouseId) ? warehouseId : undefined,
    });
    return ok(serialize(movements));
  },
  { permissions: ["inventory.view"] },
);

export const POST = withApi(
  async ({ json, session }) => {
    const parsed = movementSchema.safeParse(json);
    if (!parsed.success) {
      throw new ApiError(
        parsed.error.issues[0]?.message ?? "Datos inválidos",
        400,
        "VALIDATION_ERROR",
      );
    }

    const required =
      parsed.data.type === "AJUSTE" ? "inventory.adjust" : "inventory.create";
    if (!session.permissions.includes(required)) {
      throw new ApiError("No tiene permisos para realizar esta operación", 403, "FORBIDDEN");
    }

    const result = await registerMovement({
      companyId: session.company.id,
      userId: session.user.id,
      productId: parsed.data.productId,
      warehouseId: parsed.data.warehouseId,
      type: parsed.data.type,
      quantity: parsed.data.quantity,
      referenceType: parsed.data.referenceType ?? null,
      referenceId: parsed.data.referenceId ?? null,
      description: parsed.data.description ?? null,
    });

    return ok(serialize(result), 201);
  },
  { permissions: ["inventory.view"] },
);
