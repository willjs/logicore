import { withApi, ApiError, ok } from "@/lib/api";
import { vendorStockRequestSchema } from "@/lib/validations";
import {
  createVendorStockRequest,
  listVendorStockRequests,
} from "@/lib/services/vendor.service";
import { serialize } from "@/lib/serialize";

export const GET = withApi(
  async ({ session, req }) => {
    const mine = req.nextUrl.searchParams.get("mine");
    const rawTruckId = req.nextUrl.searchParams.get("truckId");
    const truckId = rawTruckId ? Number(rawTruckId) : undefined;
    const requests = await listVendorStockRequests(session.company.id, {
      userId: mine === "1" ? session.user.id : undefined,
      truckId: Number.isInteger(truckId) ? truckId : undefined,
    });
    return ok(serialize(requests));
  },
  { permissions: ["sales.view"] },
);

export const POST = withApi(
  async ({ json, session }) => {
    const parsed = vendorStockRequestSchema.safeParse(json);
    if (!parsed.success) {
      throw new ApiError(
        parsed.error.issues[0]?.message ?? "Datos inválidos",
        400,
        "VALIDATION_ERROR",
      );
    }
    const request = await createVendorStockRequest(session.company.id, session.user.id, {
      truckId: parsed.data.truckId,
      notes: parsed.data.notes ?? null,
      items: parsed.data.items,
    });
    return ok(serialize(request), 201);
  },
  { permissions: ["sales.create"] },
);

export const runtime = "nodejs";