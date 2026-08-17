import { withApi, ApiError, ok } from "@/lib/api";
import { prisma } from "@/lib/db";
import { roleToggleSchema } from "@/lib/validations";
import { auditLog } from "@/lib/audit";
import { toggleRole } from "@/lib/services/role.service";
import { serialize } from "@/lib/serialize";

export const POST = withApi(
  async ({ json, session, params }) => {
    const id = Number(params.id);
    if (!Number.isInteger(id)) {
      throw new ApiError("Identificador inválido", 400, "INVALID_ID");
    }

    const parsed = roleToggleSchema.safeParse(json);
    if (!parsed.success) {
      throw new ApiError(
        parsed.error.issues[0]?.message ?? "Datos inválidos",
        400,
        "VALIDATION_ERROR",
      );
    }

    const role = await toggleRole(session.company.id, id, parsed.data.active);

    await auditLog(prisma, {
      companyId: session.company.id,
      userId: session.user.id,
      action: parsed.data.active ? "ACTIVATE_ROLE" : "DEACTIVATE_ROLE",
      entity: "ROLE",
      entityId: id,
      details: { name: role.name },
    });

    return ok(serialize(role));
  },
  { permissions: ["roles.edit"] },
);
