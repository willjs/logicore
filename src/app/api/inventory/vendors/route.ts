import { withApi, ApiError, ok } from "@/lib/api";
import { prisma } from "@/lib/db";
import { vendorAssignSchema } from "@/lib/validations";
import { assignVendorStock, listVendorAssignments } from "@/lib/services/vendor.service";
import { serialize } from "@/lib/serialize";

export const GET = withApi(
  async ({ session, req }) => {
    const mine = req.nextUrl.searchParams.get("mine");
    const assignments = await listVendorAssignments(session.company.id, {
      userId: mine === "1" ? session.user.id : undefined,
    });
    return ok(serialize(assignments));
  },
  { permissions: ["sales.view"] },
);

export const POST = withApi(
  async ({ json, session }) => {
    const parsed = vendorAssignSchema.safeParse(json);
    if (!parsed.success) {
      throw new ApiError(
        parsed.error.issues[0]?.message ?? "Datos inválidos",
        400,
        "VALIDATION_ERROR",
      );
    }
    if (/camion|conductor/i.test(session.role.name)) {
      const truck = await prisma.truck.findUnique({
        where: { id: parsed.data.truckId },
        select: { companyId: true, driverId: true },
      });
      if (
        !truck ||
        truck.companyId !== session.company.id ||
        truck.driverId !== session.user.id
      ) {
        throw new ApiError("Solo puedes despachar desde tu camión", 403, "FORBIDDEN");
      }
    }
    const assignment = await assignVendorStock(session.company.id, session.user.id, {
      truckId: parsed.data.truckId,
      userId: parsed.data.userId,
      notes: parsed.data.notes ?? null,
      items: parsed.data.items,
    });
    return ok(serialize(assignment), 201);
  },
  { permissions: ["sales.create"] },
);

export const runtime = "nodejs";