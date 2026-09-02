import { withApi, ApiError, ok } from "@/lib/api";
import { vendorReturnSchema } from "@/lib/validations";
import { returnVendorStock } from "@/lib/services/vendor.service";
import { serialize } from "@/lib/serialize";

export const POST = withApi(
  async ({ json, session }) => {
    const parsed = vendorReturnSchema.safeParse(json);
    if (!parsed.success) {
      throw new ApiError(
        parsed.error.issues[0]?.message ?? "Datos inválidos",
        400,
        "VALIDATION_ERROR",
      );
    }
    const assignment = await returnVendorStock(session.company.id, session.user.id, {
      assignmentId: parsed.data.assignmentId,
      notes: parsed.data.notes ?? null,
      items: parsed.data.items,
    });
    return ok(serialize(assignment));
  },
  { permissions: ["sales.create"] },
);

export const runtime = "nodejs";