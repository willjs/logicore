import { withApi, ApiError, ok } from "@/lib/api";
import { prisma } from "@/lib/db";
import { vendorStockDispatchSchema } from "@/lib/validations";
import { dispatchVendorStockRequest } from "@/lib/services/vendor.service";
import { serialize } from "@/lib/serialize";

export const POST = withApi(
  async ({ json, session, params }) => {
    const requestId = Number(params.requestId);
    if (!Number.isInteger(requestId)) {
      throw new ApiError("Identificador inválido", 400, "INVALID_ID");
    }

    const parsed = vendorStockDispatchSchema.safeParse(json);
    if (!parsed.success) {
      throw new ApiError(
        parsed.error.issues[0]?.message ?? "Datos inválidos",
        400,
        "VALIDATION_ERROR",
      );
    }

    if (/camion|conductor/i.test(session.role.name)) {
      const truck = await prisma.truck.findFirst({
        where: { companyId: session.company.id, driverId: session.user.id },
        select: { id: true },
        orderBy: { createdAt: "asc" },
      });
      const request = await prisma.vendorStockRequest.findFirst({
        where: { id: requestId, companyId: session.company.id },
        select: { truckId: true },
      });
      if (!truck || !request || request.truckId !== truck.id) {
        throw new ApiError("Solo puedes despachar solicitudes de tu camión", 403, "FORBIDDEN");
      }
    }

    const result = await dispatchVendorStockRequest(
      session.company.id,
      session.user.id,
      requestId,
      parsed.data.items,
    );

    return ok(serialize(result));
  },
  { permissions: ["sales.create"] },
);

export const runtime = "nodejs";