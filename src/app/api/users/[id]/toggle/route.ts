import { withApi, ApiError, ok } from "@/lib/api";
import { prisma } from "@/lib/db";
import { userToggleSchema } from "@/lib/validations";
import { auditLog } from "@/lib/audit";
import { toggleUser } from "@/lib/services/user.service";
import { serialize } from "@/lib/serialize";

export const POST = withApi(
  async ({ json, session, params }) => {
    const id = Number(params.id);
    if (!Number.isInteger(id)) {
      throw new ApiError("Identificador inválido", 400, "INVALID_ID");
    }

    const parsed = userToggleSchema.safeParse(json);
    if (!parsed.success) {
      throw new ApiError(
        parsed.error.issues[0]?.message ?? "Datos inválidos",
        400,
        "VALIDATION_ERROR",
      );
    }

    if (id === session.user.id && !parsed.data.active) {
      throw new ApiError("No puede desactivar su propia cuenta", 400, "SELF_DEACTIVATE");
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new ApiError("El usuario no existe", 404, "USER_NOT_FOUND");
    }

    const user = await toggleUser(id, parsed.data.active);

    await auditLog(prisma, {
      companyId: session.company.id,
      userId: session.user.id,
      action: parsed.data.active ? "ACTIVATE_USER" : "DEACTIVATE_USER",
      entity: "USER",
      entityId: id,
      details: { email: user.email },
    });

    return ok(
      serialize({
        id: user.id,
        name: user.name,
        email: user.email,
        active: user.active,
      }),
    );
  },
  { permissions: ["users.toggle"] },
);
